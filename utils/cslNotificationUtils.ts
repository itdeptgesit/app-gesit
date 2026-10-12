import { supabase } from '../lib/supabaseClient';

export type NotificationType = 'Info' | 'Warning' | 'Success' | 'Alert';

/**
 * Creates an in-app notification in the `notifications` table.
 */
export async function createInAppNotification(
    userId: string | null,
    title: string,
    message: string,
    type: NotificationType = 'Info',
    link?: string,
    userEmail?: string
) {
    try {
        const payload: any = {
            title,
            message,
            type,
            is_read: false,
            link
        };
        
        if (userId) payload.user_id = userId;

        const { error } = await supabase.from('notifications').insert([payload]);
        if (error) {
            console.error('Failed to create in-app notification:', error.message);
        }
    } catch (err) {
        console.error('Error in createInAppNotification:', err);
    }
}

/**
 * Sends an email notification using the Supabase send-email Edge Function (Resend API).
 */
export async function sendEmailNotification(
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = false
) {
    try {
        console.log(`\n📧 Sending email to: ${to}`);
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to,
                subject,
                // If it's already HTML, send as is. If plain text, replace newlines with <br/>
                body: isHtml ? body : body.replace(/\n/g, '<br/>')
            }
        });
        
        if (error) {
            console.error('Failed to send email:', error.message);
        } else if (!data?.success) {
            console.error('Email edge function returned error:', data?.error);
        } else {
            console.log('✅ Email sent successfully!');
        }
    } catch (err) {
        console.error('Error invoking send-email function:', err);
    }
}

/**
 * High-level orchestration function to notify relevant parties about request updates.
 */
export async function notifyRequestUpdate(
    request: any, // The CSL Request object
    eventType: 'SUBMITTED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'COMPLETED' | 'RESPONDED' | 'USER_RESPONDED',
    additionalInfo?: string,
    attachments?: { name: string; url: string }[]
) {
    const requestLink = `/csl-all-requests?id=${request.id}`;

    // Helper to resolve user_id by email if ID is not directly present on request
    const resolveUserId = async (id?: string | null, email?: string | null): Promise<string | null> => {
        if (id && id !== 'null' && id !== 'undefined') return String(id);
        if (!email) return null;
        try {
            const { data } = await supabase.from('user_accounts').select('id').ilike('email', email.trim()).maybeSingle();
            return data?.id ? String(data.id) : null;
        } catch {
            return null;
        }
    };

    const requesterUserId = await resolveUserId(request.requester_id, request.requester_email);
    const assignedPicUserId = await resolveUserId(request.assigned_pic_id, request.assigned_pic_email);

    switch (eventType) {
        case 'SUBMITTED':
            // Notify CSL Staff / Admins (In-App broadcast with user_id = null)
            await createInAppNotification(
                null,
                'Permintaan Baru Diajukan',
                `Permintaan ${request.request_number} (${request.category_name || request.department || 'CSL'}) diajukan oleh ${request.requester_name || 'User'}.`,
                'Info',
                requestLink
            );
            
            if (request.requester_email) {
                await sendEmailNotification(
                    'csl_team@gesit.co.id',
                    `Permintaan Baru: ${request.request_number}`,
                    `Permintaan (${request.category_name || request.department || 'CSL'}) diajukan oleh ${request.requester_name} (${request.requester_email}).`
                );
            }
            break;
            
        case 'USER_RESPONDED':
            // Notify Assigned PIC, or all CSL staff if unassigned
            if (assignedPicUserId) {
                await createInAppNotification(
                    assignedPicUserId,
                    'Pesan Baru dari Pemohon',
                    `Pemohon (${request.requester_name}) mengirim tanggapan pada ${request.request_number}.`,
                    'Info',
                    requestLink
                );
            } else {
                await createInAppNotification(
                    null,
                    'Pesan Baru dari Pemohon',
                    `Pemohon (${request.requester_name}) mengirim tanggapan pada ${request.request_number}.`,
                    'Info',
                    requestLink
                );
            }
            break;
            
        case 'ASSIGNED':
            if (assignedPicUserId) {
                await createInAppNotification(
                    assignedPicUserId,
                    'Penugasan Permintaan Baru',
                    `Anda ditugaskan menangani permintaan ${request.request_number} (${request.requester_name}).`,
                    'Info',
                    requestLink
                );
            }
            break;

        case 'STATUS_CHANGED':
        case 'COMPLETED':
        case 'RESPONDED':
            // Notify Requester
            if (requesterUserId) {
                const title = eventType === 'COMPLETED' ? 'Permintaan Selesai' : 
                              eventType === 'RESPONDED' ? 'Respons Baru dari CSL' : 'Status Permintaan Diperbarui';
                const statusClean = (request.status || '').replace(/_/g, ' ');
                const message = `Permintaan ${request.request_number} Anda berstatus [${statusClean}]. ${additionalInfo ? '\nCatatan: ' + additionalInfo.substring(0, 100) : ''}`;
                
                await createInAppNotification(
                    requesterUserId,
                    title,
                    message,
                    eventType === 'COMPLETED' ? 'Success' : 'Info',
                    requestLink
                );
            }
            
            const getStatusColor = (status: string) => {
                switch(status) {
                    case 'COMPLETED': return '#10b981'; // emerald
                    case 'REJECTED': return '#ef4444'; // red
                    case 'IN_REVIEW': return '#8b5cf6'; // violet
                    case 'PROCESSING': return '#06b6d4'; // cyan
                    default: return '#3b82f6'; // blue
                }
            };
            
            const htmlBody = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center; border-bottom: 3px solid ${getStatusColor(request.status)};">
                    <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Update on Request</h2>
                    <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">${request.request_number}</p>
                </div>
                
                <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                    <p style="margin-top: 0; font-size: 16px;">Hello <strong>${request.requester_name}</strong>,</p>
                    <p style="font-size: 15px;">The status of your request has been updated.</p>
                    
                    <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <table width="100%" cellpadding="12" cellspacing="0" style="border-collapse: collapse; text-align: left; font-size: 14px;">
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <th style="background-color: #f8fafc; color: #64748b; font-weight: 600; width: 35%;">Request No.</th>
                                <td style="font-weight: 500; color: #0f172a;">${request.request_number}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <th style="background-color: #f8fafc; color: #64748b; font-weight: 600;">Category</th>
                                <td style="color: #334155;">${request.category_name || '-'}</td>
                            </tr>
                            <tr>
                                <th style="background-color: #f8fafc; color: #64748b; font-weight: 600;">Current Status</th>
                                <td>
                                    <span style="background-color: ${getStatusColor(request.status)}15; color: ${getStatusColor(request.status)}; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; border: 1px solid ${getStatusColor(request.status)}30;">
                                        ${request.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    ${additionalInfo ? `
                    <div style="margin: 24px 0;">
                        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message / Note</h3>
                        <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; font-style: italic; color: #475569; font-size: 14px;">
                            ${additionalInfo.replace(/\n/g, '<br/>')}
                        </div>
                    </div>` : ''}

                    ${attachments && attachments.length > 0 ? `
                    <div style="margin: 24px 0;">
                        <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Attached Documents</h3>
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
                            ${attachments.map(att => `
                                <div style="margin-bottom: 8px; display: flex; align-items: center;">
                                    <span style="background-color: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-right: 8px;">FILE</span>
                                    <a href="${att.url}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 14px; font-weight: 500;">${att.name}</a>
                                </div>
                            `).join('')}
                        </div>
                    </div>` : ''}
                    
                    <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">You can view the full details and respond to this update by logging into the CSL System.</p>
                </div>
                
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from the <strong>GESIT CSL System</strong>. Please do not reply to this email.</p>
                </div>
            </div>
            `;

            await sendEmailNotification(
                request.requester_email,
                `CSL System: Update on Request ${request.request_number}`,
                htmlBody,
                true // isHtml
            );
            break;
    }
}

/**
 * Notifies a staff member when a new routine activity is assigned to them by Admin.
 */
export async function notifyRoutineAssigned(routineTitle: string, assignedPicName: string, dueDay: number) {
    try {
        let staffUserId: string | null = null;
        if (assignedPicName) {
            const { data } = await supabase
                .from('user_accounts')
                .select('id')
                .or(`full_name.ilike.%${assignedPicName}%,email.ilike.%${assignedPicName}%`)
                .maybeSingle();
            if (data?.id) staffUserId = String(data.id);
        }

        const link = `/routine`;
        const title = `Tugas Rutin Baru Ditugaskan`;
        const message = `Anda ditugaskan oleh Admin untuk menangani aktivitas rutin: "${routineTitle}" (Jatuh tempo setiap tanggal ${dueDay}). Mohon segera ditindaklanjuti.`;

        if (staffUserId) {
            await createInAppNotification(staffUserId, title, message, 'Info', link);
        } else {
            await createInAppNotification(null, title, message, 'Info', link);
        }
    } catch (err) {
        console.error('Error notifying routine assigned:', err);
    }
}

/**
 * Notifies a user when they are mentioned in a request comment.
 */
export async function notifyUserMentioned(
    request: any,
    mentionerName: string,
    taggedUserId: string,
    taggedUserEmail: string,
    taggedUserName: string,
    commentText: string
) {
    const requestLink = `/csl-all-requests?id=${request.id}`;
    
    // In-app notification
    await createInAppNotification(
        taggedUserId,
        'Anda di-mention',
        `${mentionerName} menyebut Anda di catatan internal pada request ${request.request_number}.`,
        'Info',
        requestLink
    );
    
    // Email notification
    const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; text-align: center; border-bottom: 3px solid #8b5cf6;">
            <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">Mentioned in Note</h2>
            <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 14px;">${request.request_number}</p>
        </div>
        
        <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
            <p style="margin-top: 0; font-size: 16px;">Hello <strong>${taggedUserName}</strong>,</p>
            <p style="font-size: 15px;"><strong>${mentionerName}</strong> mentioned you in an internal note for request <strong>${request.request_number}</strong>.</p>
            
            <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message</h3>
                <div style="background-color: #f1f5f9; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 0 8px 8px 0; font-style: italic; color: #475569; font-size: 14px;">
                    ${commentText.replace(/\n/g, '<br/>')}
                </div>
            </div>
            
            <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">Please log in to the CSL System to view and respond.</p>
        </div>
    </div>
    `;

    await sendEmailNotification(
        taggedUserEmail,
        `CSL System: You were mentioned by ${mentionerName}`,
        htmlBody,
        true // isHtml
    );
}
