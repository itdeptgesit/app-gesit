import { supabase } from './supabaseClient';

export const trackActivity = async (
    userName: string,
    userRole: string,
    action: string,
    module: string,
    details?: string
) => {
    try {
        const { error } = await supabase
            .from('user_activity_logs')
            .insert([
                {
                    user_name: userName,
                    user_role: userRole,
                    action,
                    module,
                    details,
                    created_at: new Date().toISOString(),
                },
            ]);

        if (error) {
            if (error.code === '42P01') {
                console.warn("Table 'user_activity_logs' does not exist. Tracking skipped.");
            } else {
                console.error('Error tracking activity:', error);
            }
        }
    } catch (err) {
        console.error('Failed to track activity:', err);
    }
};
