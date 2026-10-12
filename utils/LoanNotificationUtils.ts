
import { supabase } from '../lib/supabaseClient';
import { UserAccount } from '../types';
import { sendNotificationToAdmins, sendNotificationToUser } from './NotificationSystemUtils';

/**
 * Checks for asset loans that have reached their expected return date
 * and creates notifications for both the user and admin.
 */
export const checkAssetLoanOverdue = async (currentUser: UserAccount | null) => {
    console.log('[DEBUG OVERDUE] Function checkAssetLoanOverdue called.');
    console.log('[DEBUG OVERDUE] Current user:', currentUser?.fullName, 'Role:', currentUser?.role);

    // Only admins or staff should trigger the global overdue check to avoid redundant DB calls and ensure authority
    if (!currentUser) {
        console.log('[DEBUG OVERDUE] NO current user. Exiting.');
        return;
    }

    const roleLower = currentUser.role?.toLowerCase();
    if (roleLower !== 'admin' && roleLower !== 'staff') {
        console.log('[DEBUG OVERDUE] User is not Admin/Staff. skipping global check.');
        return;
    }

    try {
        const now = new Date().toISOString();
        
        // 1. Fetch all active or overdue loans that are past their expected return date
        const { data: overdueLoans, error: fetchError } = await supabase
            .from('it_asset_loans')
            .select(`
                *,
                it_assets (
                    item_name,
                    asset_id
                )
            `)
            .in('status', ['Active', 'Overdue'])
            .lt('expected_return_date', now);

        if (fetchError) {
            console.error('[DEBUG OVERDUE] Fetch error:', fetchError);
            return;
        }

        if (!overdueLoans || overdueLoans.length === 0) {
            console.log('[DEBUG OVERDUE] No overdue loans found.');
            return;
        }

        console.log(`[DEBUG OVERDUE] Found ${overdueLoans.length} potential overdue loans.`);

        for (const loan of overdueLoans) {
            // 2. Mark as Overdue in DB if it's still marked as Active
            if (loan.status === 'Active') {
                const { error: updateError } = await supabase
                    .from('it_asset_loans')
                    .update({ status: 'Overdue' })
                    .eq('id', loan.id);
                
                if (updateError) console.error('[DEBUG OVERDUE] Update failed for', loan.loan_id, updateError);
                else console.log('[DEBUG OVERDUE] Status updated to Overdue for', loan.loan_id);
            }

            // 3. Find borrower email by looking up user_accounts
            let borrowerAccountQuery = supabase.from('user_accounts').select('id, email');
            
            if (loan.borrower_email) {
                // Prioritize email match if available
                borrowerAccountQuery = borrowerAccountQuery.ilike('email', loan.borrower_email);
            } else {
                // Fallback to name match
                borrowerAccountQuery = borrowerAccountQuery.ilike('full_name', loan.borrower_name);
            }

            const { data: borrowerAccount } = await borrowerAccountQuery.maybeSingle();
            const borrowerEmail = borrowerAccount?.email || loan.borrower_email;
            const borrowerId = borrowerAccount?.id;

            console.log('[DEBUG OVERDUE] Borrower account fetch:', !!borrowerAccount, 'Email:', borrowerEmail, 'ID:', borrowerId);

            // 4. Check if notification already exists for this loan (prevent duplicates)
            const assetLabel = loan.it_assets?.item_name || 'Asset';
            const { data: existingNotif } = await supabase
                .from('notifications')
                .select('id')
                .eq('title', 'Asset Return Overdue')
                .ilike('message', `%${loan.it_assets?.asset_id || loan.asset_id}%`)
                .ilike('user_email', borrowerEmail || currentUser.email)
                .limit(1);

            if (existingNotif && existingNotif.length > 0) {
                console.log('[DEBUG OVERDUE] Notification already exists for loan', loan.loan_id, '- skipping.');
                continue;
            }

            // 5. Create notification for Borrower
            if (borrowerEmail) {
                await sendNotificationToUser(
                    { email: borrowerEmail, id: borrowerId },
                    'Asset Return Overdue',
                    `Reminder: The asset "${assetLabel}" (${loan.it_assets?.asset_id || loan.asset_id}) was scheduled to be returned on ${new Date(loan.expected_return_date).toLocaleDateString()}. Please return it as soon as possible.`,
                    'Alert',
                    'asset-loan'
                );
                
                // Trigger email through bridge if possible
                await triggerEmailNotification(borrowerEmail, loan);
            }

            // 6. Create notification for Admin
            const { data: existingAdminNotif } = await supabase
                .from('notifications')
                .select('id')
                .eq('title', 'Overdue Asset Warning')
                .ilike('message', `%${loan.it_assets?.asset_id || loan.asset_id}%`)
                .ilike('user_email', currentUser.email)
                .limit(1);

            if (!existingAdminNotif || existingAdminNotif.length === 0) {
                await sendNotificationToAdmins(
                    'Overdue Asset Warning',
                    `Critical: The asset "${assetLabel}" (${loan.it_assets?.asset_id || loan.asset_id}) borrowed by ${loan.borrower_name} is overdue.`,
                    'Alert',
                    'asset-loan'
                );
            }
        }
        
    } catch (error) {
        console.error('[DEBUG OVERDUE] Global Error:', error);
    }
};

/**
 * Sends an email notification via Supabase Edge Function.
 */
const triggerEmailNotification = async (email: string, loan: any) => {
    try {
        console.log(`[DEBUG OVERDUE] Invoking Edge Function for: ${email}`);
        
        const { data, error } = await supabase.functions.invoke('send-overdue-alert', {
            body: {
                to: email,
                borrowerName: loan.borrower_name,
                assetName: loan.it_assets?.item_name || 'Equipment',
                dueDate: new Date(loan.expected_return_date).toLocaleDateString()
            }
        });

        if (error) throw error;
        console.log('[DEBUG OVERDUE] Edge function success:', data);
    } catch (err) {
        console.error('[DEBUG OVERDUE] Edge function failure:', err);
    }
};
