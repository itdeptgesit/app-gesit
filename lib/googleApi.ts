/**
 * lib/googleApi.ts
 * Integrations for Google Drive API, Google People API, and Gmail API.
 * Reuses OAuth tokens and silent refresh from lib/googleCalendar.ts.
 */

import { getStoredToken, silentRefresh, clearToken } from './googleCalendar';

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
}

export interface PeopleContact {
  name: string;
  email: string;
  avatar: string;
}

export interface EmailNotificationPayload {
  task: string;
  description?: string;
  priority: string;
  status: string;
  dueDate: string;
  startDate?: string;
  assignee: string;
  assigneeEmail?: string;
  creatorName?: string;
  isNew: boolean;
}

// ── CORE GOOGLE FETCH HELPER ───────────────────────────────────────────────

const googleApiFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  let token = getStoredToken();
  if (!token) {
    try {
      token = await silentRefresh();
    } catch (refreshErr) {
      clearToken();
      throw new Error('Google connection expired. Please reconnect.');
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearToken();
      }
      let errMsg = `Google API error ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.error?.message || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    return res.json();
  } catch (err: any) {
    if (err.message?.includes('401') || err.message?.includes('403')) {
      clearToken();
    }
    throw err;
  }
};

// ── GOOGLE DRIVE API ───────────────────────────────────────────────────────

/**
 * Fetch and search files in Google Drive.
 * @param query Optional search query to filter files by name.
 */
export const fetchDriveFiles = async (query?: string): Promise<DriveFile[]> => {
  try {
    let q = "trashed = false";
    if (query) {
      // Escape single quotes in query
      const escapedQuery = query.replace(/'/g, "\\'");
      q += ` and name contains '${escapedQuery}'`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?` + 
      new URLSearchParams({
        q,
        fields: 'files(id, name, mimeType, webViewLink, iconLink, thumbnailLink)',
        pageSize: '50',
        orderBy: 'modifiedTime desc',
      });

    const data = await googleApiFetch(url);
    return (data.files || []) as DriveFile[];
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    throw error;
  }
};

// ── GOOGLE PEOPLE API ──────────────────────────────────────────────────────

/**
 * Fetch directory profiles and personal contacts for name autocomplete.
 * Merges contacts and directory people, deduplicates by email, and provides a sleek list.
 */
export const searchPeople = async (query: string): Promise<PeopleContact[]> => {
  if (!query || query.trim().length < 2) return [];

  const resultsMap = new Map<string, PeopleContact>();

  // Helper to parse contact info
  const parsePerson = (person: any) => {
    const name = person.names?.[0]?.displayName || '';
    const email = person.emailAddresses?.[0]?.value || '';
    const avatar = person.photos?.[0]?.url || '';
    if (name && email) {
      resultsMap.set(email.toLowerCase(), { name, email, avatar });
    }
  };

  try {
    // 1. Fetch personal contacts matching the query
    const contactsUrl = `https://people.googleapis.com/v1/people/me/connections?` +
      new URLSearchParams({
        personFields: 'names,photos,emailAddresses',
        pageSize: '100',
      });

    const contactsData = await googleApiFetch(contactsUrl).catch(() => ({ connections: [] }));
    const filteredConnections = (contactsData.connections || []).filter((person: any) => {
      const name = (person.names?.[0]?.displayName || '').toLowerCase();
      const email = (person.emailAddresses?.[0]?.value || '').toLowerCase();
      const q = query.toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    filteredConnections.forEach(parsePerson);
  } catch (err) {
    console.warn('Could not load Google Contacts matching query:', err);
  }

  try {
    // 2. Search directory profiles (Workspace/Domain directories)
    const directoryUrl = `https://people.googleapis.com/v1/people:searchDirectoryPeople?` +
      new URLSearchParams({
        query,
        readMask: 'names,photos,emailAddresses',
        sources: 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE',
        pageSize: '20',
      });

    const directoryData = await googleApiFetch(directoryUrl).catch(() => ({ people: [] }));
    (directoryData.people || []).forEach(parsePerson);
  } catch (err) {
    // Gracefully ignore directory permission errors (e.g. if using a personal Gmail account)
    console.debug('Google Directory search skipped (likely personal account or disabled directory):', err);
  }

  return Array.from(resultsMap.values());
};

/**
 * Fetch current user profile to display logged-in user profile photo and info.
 */
export const fetchCurrentUserProfile = async (): Promise<PeopleContact | null> => {
  try {
    const data = await googleApiFetch('https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses');
    const name = data.names?.[0]?.displayName || '';
    const email = data.emailAddresses?.[0]?.value || '';
    const avatar = data.photos?.[0]?.url || '';
    if (name && email) {
      return { name, email, avatar };
    }
    return null;
  } catch (err) {
    console.error('Error fetching current Google profile:', err);
    return null;
  }
};

// ── GMAIL API ──────────────────────────────────────────────────────────────

/**
 * Encodes an email draft as a base64url RFC 822 formatted string.
 */
const createRawEmail = (to: string, subject: string, htmlBody: string): string => {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
  ];

  const rawEmail = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

/**
 * Automatically notifies an assignee when a weekly task is created or updated.
 */
export const sendGmailNotification = async (payload: EmailNotificationPayload): Promise<void> => {
  if (!payload.assigneeEmail) {
    console.warn(`Gmail notification skipped: No email found for assignee "${payload.assignee}"`);
    return;
  }

  const portalUrl = window.location.origin;
  const actionText = payload.isNew ? 'CREATED' : 'UPDATED';
  const actionColor = payload.isNew ? '#2563EB' : '#059669'; // Blue vs Emerald
  const priorityColor = payload.priority === 'High' ? '#DC2626' : payload.priority === 'Medium' ? '#D97706' : '#2563EB';

  const subject = `[GESIT PORTAL] Task ${actionText}: ${payload.task}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Figtree', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 20px; }
        .card { max-width: 600px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto; overflow: hidden; }
        .header { background: ${actionColor}; padding: 30px 24px; text-align: center; color: #FFFFFF; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
        .content { padding: 32px 24px; }
        .task-title { font-size: 18px; font-weight: 800; color: #0F172A; margin-top: 0; margin-bottom: 12px; line-height: 1.4; }
        .task-desc { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap; background: #F1F5F9; padding: 16px; border-radius: 12px; border-left: 4px solid ${actionColor}; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
        .meta-item { background: #F8FAFC; padding: 12px 16px; border-radius: 10px; border: 1px solid #F1F5F9; }
        .meta-label { font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .meta-value { font-size: 13px; font-weight: 700; color: #334155; }
        .btn { display: block; text-align: center; background: #0F172A; color: #FFFFFF !important; font-size: 13px; font-weight: 700; text-decoration: none; padding: 14px 24px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.05em; transition: background 0.2s; }
        .footer { padding: 24px; text-align: center; font-size: 11px; color: #94A3B8; border-t: 1px solid #F1F5F9; background: #FAFBFD; }
        .footer a { color: #2563EB; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Task ${actionText}</h1>
        </div>
        <div class="content">
          <h2 class="task-title">${payload.task}</h2>
          
          ${payload.description ? `
            <div class="task-desc">
              ${payload.description}
            </div>
          ` : ''}

          <div style="margin-bottom: 24px;">
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #64748B;">Assignee</span>
              <span style="font-size: 12px; font-weight: 800; color: #0F172A;">${payload.assignee} (${payload.assigneeEmail})</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #64748B;">Priority</span>
              <span style="font-size: 12px; font-weight: 800; color: ${priorityColor};">${payload.priority}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #64748B;">Status</span>
              <span style="font-size: 12px; font-weight: 800; color: #334155;">${payload.status}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
              <span style="font-size: 12px; font-weight: 700; color: #64748B;">Due Date</span>
              <span style="font-size: 12px; font-weight: 800; color: #0F172A;">${payload.dueDate}</span>
            </div>
            ${payload.creatorName ? `
              <div style="margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
                <span style="font-size: 12px; font-weight: 700; color: #64748B;">Triggered By</span>
                <span style="font-size: 12px; font-weight: 800; color: #0F172A;">${payload.creatorName}</span>
              </div>
            ` : ''}
          </div>

          <a href="${portalUrl}" class="btn" target="_blank">View Task in Gesit Portal</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from Gesit Portal. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Gesit ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const raw = createRawEmail(payload.assigneeEmail, subject, htmlBody);
    await googleApiFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    });
    console.log(`Gmail notification sent successfully to ${payload.assigneeEmail}`);
  } catch (error) {
    console.error('Failed to send Gmail notification:', error);
  }
};
