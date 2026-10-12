-- MIGRATION: Add Google OAuth columns to user_accounts table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard) to enable cross-device Google persistency!

ALTER TABLE public.user_accounts 
ADD COLUMN IF NOT EXISTS google_access_token text,
ADD COLUMN IF NOT EXISTS google_token_expiry text,
ADD COLUMN IF NOT EXISTS google_connected_flag boolean DEFAULT false;

-- Add comment to document the new columns
COMMENT ON COLUMN public.user_accounts.google_access_token IS 'OAuth2 access token for Google Workspace integrations (Drive, Calendar, etc)';
COMMENT ON COLUMN public.user_accounts.google_token_expiry IS 'Expiry timestamp for the Google OAuth2 access token';
COMMENT ON COLUMN public.user_accounts.google_connected_flag IS 'Persistent flag showing if the user has active Google authorization';
