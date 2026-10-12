import { supabase } from '../lib/supabaseClient';

export interface TicketEmailData {
    ticketId: string;
    requesterName: string;
    requesterEmail: string;
    department: string;
    subject: string;
    priority: string;
    category: string;
    description: string;
}

export const sendTicketNotificationEmail = async (data: TicketEmailData) => {
    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                from: 'GESIT ERP Ticketing <it-support@gesit.co.id>',
                to: ['it.operation@gesit.co.id'],
                subject: `[NEW TICKET] ${data.priority.toUpperCase()} - ${data.subject}`,
                body: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                        <div style="background-color: #2563eb; padding: 20px; color: white;">
                            <h2 style="margin: 0; font-size: 20px;">Support Request Received</h2>
                            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Ticket ID: ${data.ticketId}</p>
                        </div>
                        <div style="padding: 24px;">
                            <p>Halo Tim IT Operation,</p>
                            <p>Ada request ticketing baru yang butuh perhatian kamu:</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Pengirim</td>
                                    <td style="padding: 8px 0;">: ${data.requesterName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Departemen</td>
                                    <td style="padding: 8px 0;">: ${data.department}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Kategori</td>
                                    <td style="padding: 8px 0;">: ${data.category}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold;">Prioritas</td>
                                    <td style="padding: 8px 0;">: <span style="color: ${data.priority === 'High' ? '#e11d48' : '#2563eb'}; font-weight: bold;">${data.priority}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 16px 0 8px; font-weight: bold;" colspan="2">Pesan/Masalah:</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9;" colspan="2">
                                        <em>"${data.description}"</em>
                                    </td>
                                </tr>
                            </table>
                            
                            <div style="margin-top: 30px;">
                                <a href="https://gesit-erp.vercel.app/helpdesk" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                    Buka Helpdesk Center
                                </a>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #eee;">
                            Ini adalah notifikasi otomatis dari Sistem GESIT PORTAL.
                        </div>
                    </div>
                `
            }
        });

        if (error) {
            throw new Error(error.message || 'Failed to invoke send-email function');
        }

        console.log('Email Notification: Sent successfully to IT Operation');
    } catch (err) {
        console.error('Email Notification: Failed to send', err);
    }
};

export const sendPasswordResetNotificationEmail = async (email: string) => {
    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                from: 'GESIT ERP Security <it-support@gesit.co.id>',
                to: [email, 'it.operation@gesit.co.id'],
                subject: `[SECURITY] Password Reset Requested for ${email}`,
                body: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                        <div style="background-color: #0f172a; padding: 20px; color: white;">
                            <h2 style="margin: 0; font-size: 20px;">Password Reset Request Logged</h2>
                            <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Security Event</p>
                        </div>
                        <div style="padding: 24px;">
                            <p>Halo,</p>
                            <p>Kami mendeteksi permintaan reset password untuk akun <strong>${email}</strong> melalui halaman login.</p>
                            <p>Tautan reset password resmi sedang diproses dan dikirim melalui sistem Auth kami. <strong>Mohon periksa kotak masuk (inbox) atau folder Spam Anda untuk email dari "Supabase" / "Gesit" yang berisi link reset.</strong></p>
                            
                            <div style="margin-top: 30px; padding: 16px; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 8px; color: #be123c;">
                                <strong>PENTING:</strong> Jika Anda tidak melakukan permintaan reset ini, segera hubungi Tim IT kami karena mungkin ada percobaan akses ilegal ke akun Anda.
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #eee;">
                            Ini adalah notifikasi otomatis dari Sistem Security GESIT PORTAL.
                        </div>
                    </div>
                `
            }
        });

        if (error) {
            throw new Error(error.message || 'Failed to invoke send-email function');
        }

        console.log('Password Reset Notification: Sent successfully');
    } catch (err) {
        console.error('Password Reset Notification: Failed to send', err);
    }
};