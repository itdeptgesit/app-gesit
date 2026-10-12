-- Add e_sign_url column to user_accounts (used by CSL E-Signature upload)
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS e_sign_url TEXT;

-- Reload PostgREST schema cache so the new column is immediately visible
NOTIFY pgrst, 'reload schema';