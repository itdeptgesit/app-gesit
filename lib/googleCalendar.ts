import { supabase } from './supabaseClient';


const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/user.emails.read https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TOKEN_STORAGE_KEY = 'gcal_access_token';
const TOKEN_EXPIRY_KEY  = 'gcal_token_expiry';

// ── Types ──────────────────────────────────────────────────────────────────
export interface GCalEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    colorId?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end:   { date?: string; dateTime?: string; timeZone?: string };
    status?: string;
    htmlLink?: string;
    calendarId?: string;
    backgroundColor?: string;
    organizer?: { email: string; displayName?: string; self?: boolean };
    creator?: { email: string; displayName?: string; self?: boolean };
    attendees?: Array<{
        email: string;
        displayName?: string;
        organizer?: boolean;
        responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
        self?: boolean;
    }>;
}

export interface GCalCalendar {
    id: string;
    summary: string;
    backgroundColor?: string;
    primary?: boolean;
}

// ── Token helpers ──────────────────────────────────────────────────────────
export const saveTokensToSupabase = async (token: string, expiry: string, connected: boolean) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email;
        if (!email) return;

        await supabase
            .from('user_accounts')
            .update({
                google_access_token: token || null,
                google_token_expiry: expiry || null,
                google_connected_flag: connected
            })
            .eq('email', email);
    } catch (err: any) {
        console.warn('Failed to sync Google connection to Supabase:', err.message);
    }
};

export const getStoredToken = (): string | null => {
    const token  = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
        return null;
    }
    return token;
};

const storeToken = (token: string, expiresInSeconds: number) => {
    const expiry = String(Date.now() + expiresInSeconds * 1000);
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry);
    localStorage.setItem('google_connected_flag', 'true');
    saveTokensToSupabase(token, expiry, true);
};

export const clearToken = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem('google_connected_flag');
    saveTokensToSupabase('', '', false);
};

export const isGoogleConnected = (): boolean => {
    return localStorage.getItem('google_connected_flag') === 'true' && getStoredToken() !== null;
};

// ── OAuth ──────────────────────────────────────────────────────────────────
declare const google: any;

let tokenClientInstance: any = null;

const getTokenClient = (
    onSuccess: (token: string) => void,
    onError: (err: any) => void
) => {
    if (!tokenClientInstance) {
        tokenClientInstance = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    onError(response);
                    return;
                }
                const expiresIn = parseInt(response.expires_in || '3600');
                storeToken(response.access_token, expiresIn);
                onSuccess(response.access_token);
            },
        });
    }
    return tokenClientInstance;
};

export const signInWithGoogle = (): Promise<string> =>
    new Promise((resolve, reject) => {
        const client = getTokenClient(resolve, reject);
        client.requestAccessToken({ prompt: 'consent' });
    });

export const silentRefresh = (): Promise<string> =>
    new Promise((resolve, reject) => {
        const client = getTokenClient(resolve, reject);
        client.requestAccessToken({ prompt: '' });
    });

export const signOutGoogle = () => {
    const token = getStoredToken();
    if (token && typeof google !== 'undefined') {
        google.accounts.oauth2.revoke(token, () => {});
    }
    clearToken();
    tokenClientInstance = null;
};

// ── API fetch helper ───────────────────────────────────────────────────────
const gFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
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
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                clearToken();
            }
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `Google API error ${res.status}`);
        }

        return res.json();
    } catch (err: any) {
        if (err.message?.includes('401') || err.message?.includes('403')) {
            clearToken();
        }
        throw err;
    }
};

// ── Calendar list ──────────────────────────────────────────────────────────
export const fetchCalendarList = async (): Promise<GCalCalendar[]> => {
    const data = await gFetch(`${CALENDAR_API}/users/me/calendarList`);
    return (data.items || []) as GCalCalendar[];
};

// ── Events ─────────────────────────────────────────────────────────────────
export const fetchEventsForMonth = async (
    year: number,
    month: number, // 0-indexed
    calendarId = 'primary',
    backgroundColor = ''
): Promise<GCalEvent[]> => {
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const url = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?` +
        new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: 'true',
            orderBy: 'startTime',
            maxResults: '250',
        });

    const data = await gFetch(url);
    return ((data.items || []) as GCalEvent[]).map(e => ({ ...e, calendarId, backgroundColor }));
};

export const createGCalEvent = async (
    summary: string,
    startDate: string,  // YYYY-MM-DD
    endDate: string,    // YYYY-MM-DD (inclusive, GCal uses exclusive end)
    description?: string,
    startTime?: string, // HH:mm — makes it a timed event
    calendarId = 'primary'
): Promise<GCalEvent> => {
    // GCal end for all-day is exclusive (add 1 day)
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    const endExclusive = end.toISOString().split('T')[0];

    const body: any = {
        summary,
        description,
        start: startTime
            ? { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Jakarta' }
            : { date: startDate },
        end: startTime
            ? { dateTime: `${endDate}T${startTime}:00`, timeZone: 'Asia/Jakarta' }
            : { date: endExclusive },
    };

    return gFetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: 'POST', body: JSON.stringify(body) }
    );
};

export const deleteGCalEvent = async (
    eventId: string,
    calendarId = 'primary'
): Promise<void> => {
    const token = getStoredToken();
    if (!token) return;

    await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    );
};

// ── Date helpers ──────────────────────────────────────────────────────────
/** Returns YYYY-MM-DD from a GCalEvent start (works for both all-day and timed) */
export const gcalStartDate = (event: GCalEvent): string =>
    event.start.date ?? (event.start.dateTime ?? '').split('T')[0];

/** Returns YYYY-MM-DD from a GCalEvent end (all-day end is exclusive → subtract 1 day) */
export const gcalEndDate = (event: GCalEvent): string => {
    if (event.end.date) {
        const d = new Date(event.end.date);
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
    }
    return (event.end.dateTime ?? '').split('T')[0];
};

/** Returns HH:mm string if the event has a specific time, otherwise empty string */
export const gcalStartTime = (event: GCalEvent): string => {
    if (!event.start.dateTime) return '';
    return event.start.dateTime.split('T')[1]?.substring(0, 5) ?? '';
};

/** Returns HH:mm string if the event has a specific end time, otherwise empty string */
export const gcalEndTime = (event: GCalEvent): string => {
    if (!event.end.dateTime) return '';
    return event.end.dateTime.split('T')[1]?.substring(0, 5) ?? '';
};
