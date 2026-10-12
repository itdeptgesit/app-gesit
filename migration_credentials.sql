
-- Create credentials table
CREATE TABLE IF NOT EXISTS public.credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    service_url text,
    username text NOT NULL,
    password text,
    notes text,
    category text DEFAULT 'General',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text
);

-- Enable RLS
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
-- Allow Read for Admin and Staff
CREATE POLICY "Allow read for Admin and Staff" ON public.credentials
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE user_accounts.email = auth.jwt() ->> 'email'
            AND (user_accounts.role = 'Admin' OR user_accounts.role = 'Staff')
        )
    );

-- Allow Insert for Admin
CREATE POLICY "Allow insert for Admin" ON public.credentials
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE user_accounts.email = auth.jwt() ->> 'email'
            AND (user_accounts.role = 'Admin' OR user_accounts.role = 'Staff')
        )
    );

-- Allow Update for Admin
CREATE POLICY "Allow update for Admin" ON public.credentials
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE user_accounts.email = auth.jwt() ->> 'email'
            AND (user_accounts.role = 'Admin' OR user_accounts.role = 'Staff')
        )
    );

-- Allow Delete for Admin
CREATE POLICY "Allow delete for Admin" ON public.credentials
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_accounts
            WHERE user_accounts.email = auth.jwt() ->> 'email'
            AND (user_accounts.role = 'Admin' OR user_accounts.role = 'Staff')
        )
    );

-- Log table creation
INSERT INTO public.audit_logs (user_name, user_role, action, module, details)
VALUES ('System', 'System', 'Create Table', 'Database', 'Created credentials table with RLS');
