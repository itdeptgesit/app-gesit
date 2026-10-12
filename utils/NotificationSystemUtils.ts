
import { supabase } from '../lib/supabaseClient';

/**
 * Sends a notification to all users with Admin, Super Admin, or Staff roles.
 */
export const sendNotificationToAdmins = async (
    title: string, 
    message: string, 
    type: 'Info' | 'Success' | 'Warning' | 'Alert' = 'Info', 
    link?: string
) => {
    try {
        // 1. Fetch all users who should receive admin-level notifications
        const { data: allUsers, error: fetchError } = await supabase
            .from('user_accounts')
            .select('id, email, role, job_title');

        if (fetchError) {
            console.error('[NotificationSystem] Error fetching admins:', fetchError);
            return;
        }

        const admins = allUsers?.filter(u => {
            const r = u.role?.toLowerCase();
            const isSupport = r === 'admin' || r === 'super admin' || r === 'staff' || (u as any).job_title?.toLowerCase().includes('it');
            return isSupport;
        });

        if (fetchError) {
            console.error('[NotificationSystem] Error fetching admins:', fetchError);
            return;
        }

        if (!admins || admins.length === 0) {
            console.warn('[NotificationSystem] No admins found to notify.');
            return;
        }

        // 2. Prepare notification records for all admins
        // Filter out duplicate emails just in case
        const notifications = admins.map(a => ({
            user_id: a.id,
            user_email: a.email.toLowerCase(),
            title,
            message,
            type,
            link,
            is_read: false,
            created_at: new Date().toISOString()
        }));

        // 3. Batch insert notifications
        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (insertError) {
            console.error('[NotificationSystem] Error inserting notifications:', insertError);
        } else {
            console.log(`[NotificationSystem] Successfully notified ${notifications.length} admins.`);
        }
    } catch (err) {
        console.error('[NotificationSystem] Critical error:', err);
    }
};
/**
 * Sends a notification to a specific user by email or account ID.
 */
export const sendNotificationToUser = async (
    target: { email?: string; id?: number | string },
    title: string, 
    message: string, 
    type: 'Info' | 'Success' | 'Warning' | 'Alert' = 'Info', 
    link?: string
) => {
    try {
        let userId = target.id;
        let userEmail = target.email?.toLowerCase();

        // 1. If we only have email, fetch the ID for database integrity
        if (!userId && userEmail) {
            const { data: userAccount } = await supabase
                .from('user_accounts')
                .select('id, email')
                .ilike('email', userEmail)
                .maybeSingle();
            
            if (userAccount) {
                userId = userAccount.id;
                userEmail = userAccount.email.toLowerCase();
            }
        }

        if (!userId && !userEmail) {
            console.warn('[NotificationSystem] Cannot notify user: neither ID nor Email provided.');
            return;
        }

        // 2. Insert notification
        const { error: insertError } = await supabase
            .from('notifications')
            .insert([{
                user_id: userId,
                user_email: userEmail,
                title,
                message,
                type,
                link,
                is_read: false,
                created_at: new Date().toISOString()
            }]);

        if (insertError) {
            console.error('[NotificationSystem] Error sending individual notification:', insertError);
        } else {
            console.log(`[NotificationSystem] Notification sent to ${userEmail || userId}.`);
        }
    } catch (err) {
        console.error('[NotificationSystem] Generic notification error:', err);
    }
};
