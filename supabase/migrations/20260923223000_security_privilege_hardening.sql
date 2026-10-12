-- Phase 2 security hardening: remove dangerous functions and split broad policies.
-- No business rows are modified or deleted by this migration.

BEGIN;

-- Destructive maintenance RPCs are removed, not merely hidden from PostgREST.
DROP FUNCTION IF EXISTS public.wipe_tables(text[]);
DROP FUNCTION IF EXISTS public.wipe_table(text);

-- Centralized authorization helpers. SECURITY DEFINER prevents RLS recursion
-- while returning only a boolean; callers cannot use these to read profiles.
CREATE OR REPLACE FUNCTION public.current_user_account_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ua.id
  FROM public.user_accounts ua
  WHERE ua.auth_id = auth.uid()
     OR lower(ua.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  ORDER BY (ua.auth_id = auth.uid()) DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_group(required_groups text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.user_accounts ua
    WHERE (ua.auth_id = auth.uid()
       OR lower(ua.email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      AND (
        lower(trim(COALESCE(ua.role, ''))) IN ('admin', 'super admin', 'super_admin')
        OR EXISTS (
          SELECT 1
          FROM unnest(COALESCE(ua.groups, ARRAY[]::text[])) AS account_group
          WHERE lower(trim(account_group)) = ANY(required_groups)
        )
      )
  ), false)
$$;

REVOKE ALL ON FUNCTION public.current_user_account_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_any_group(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_account_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_group(text[]) TO authenticated, service_role;

-- Trigger functions do not need direct browser execution.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.encrypt_credential_password() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.encrypt_credential_password() SET search_path = public, extensions, pg_temp;

-- user_accounts must remain readable by authenticated users for approval chains,
-- directories and attendance. Writes are now own-profile or management-only.
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_authenticated_select ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_self_insert ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_self_update ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_management_insert ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_management_update ON public.user_accounts;
DROP POLICY IF EXISTS user_accounts_management_delete ON public.user_accounts;

CREATE POLICY user_accounts_authenticated_select
ON public.user_accounts FOR SELECT TO authenticated
USING (true);

CREATE POLICY user_accounts_self_insert
ON public.user_accounts FOR INSERT TO authenticated
WITH CHECK (
  lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  AND (auth_id IS NULL OR auth_id = auth.uid())
  AND lower(trim(COALESCE(role, 'user'))) = 'user'
  AND COALESCE(groups, ARRAY['general_user']::text[]) <@ ARRAY['general_user']::text[]
);

CREATE POLICY user_accounts_self_update
ON public.user_accounts FOR UPDATE TO authenticated
USING (
  auth_id = auth.uid()
  OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  (auth_id = auth.uid() OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  AND lower(trim(COALESCE(role, 'user'))) = 'user'
  AND COALESCE(groups, ARRAY['general_user']::text[]) <@ ARRAY['general_user']::text[]
);

CREATE POLICY user_accounts_management_insert
ON public.user_accounts FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_any_group(ARRAY['it_management']));
CREATE POLICY user_accounts_management_update
ON public.user_accounts FOR UPDATE TO authenticated
USING (public.current_user_has_any_group(ARRAY['it_management']))
WITH CHECK (public.current_user_has_any_group(ARRAY['it_management']));
CREATE POLICY user_accounts_management_delete
ON public.user_accounts FOR DELETE TO authenticated
USING (public.current_user_has_any_group(ARRAY['it_management']));

REVOKE ALL ON public.user_accounts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_accounts TO authenticated;

-- Operational activity is readable and appendable by logged-in users, but only
-- IT management may rewrite or delete history.
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_authenticated_select ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_authenticated_insert ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_management_update ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_management_delete ON public.activity_logs;
CREATE POLICY activity_logs_authenticated_select ON public.activity_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY activity_logs_authenticated_insert ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY activity_logs_management_update ON public.activity_logs
  FOR UPDATE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','it_staff']))
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management','it_staff']));
CREATE POLICY activity_logs_management_delete ON public.activity_logs
  FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management']));
REVOKE ALL ON public.activity_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;

-- Audit logs are append-only for normal clients.
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_activity_logs_authenticated_select ON public.user_activity_logs;
DROP POLICY IF EXISTS user_activity_logs_authenticated_insert ON public.user_activity_logs;
DROP POLICY IF EXISTS user_activity_logs_management_delete ON public.user_activity_logs;
CREATE POLICY user_activity_logs_authenticated_select ON public.user_activity_logs
  FOR SELECT TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','it_staff']));
CREATE POLICY user_activity_logs_authenticated_insert ON public.user_activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY user_activity_logs_management_delete ON public.user_activity_logs
  FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management']));
REVOKE ALL ON public.user_activity_logs FROM anon;
GRANT SELECT, INSERT, DELETE ON public.user_activity_logs TO authenticated;
REVOKE UPDATE ON public.user_activity_logs FROM authenticated;

-- Credential vault: only super admins and IT management can access cleartext.
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Credential full access" ON public.credentials;
DROP POLICY IF EXISTS "Allow read for Admin and Staff" ON public.credentials;
DROP POLICY IF EXISTS "Allow insert for Admin" ON public.credentials;
DROP POLICY IF EXISTS "Allow update for Admin" ON public.credentials;
DROP POLICY IF EXISTS "Allow delete for Admin" ON public.credentials;
DROP POLICY IF EXISTS credentials_management_select ON public.credentials;
DROP POLICY IF EXISTS credentials_management_insert ON public.credentials;
DROP POLICY IF EXISTS credentials_management_update ON public.credentials;
DROP POLICY IF EXISTS credentials_management_delete ON public.credentials;
CREATE POLICY credentials_management_select ON public.credentials
  FOR SELECT TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management']));
CREATE POLICY credentials_management_insert ON public.credentials
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management']));
CREATE POLICY credentials_management_update ON public.credentials
  FOR UPDATE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management']))
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management']));
CREATE POLICY credentials_management_delete ON public.credentials
  FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management']));
REVOKE ALL ON public.credentials FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credentials TO authenticated;

CREATE OR REPLACE FUNCTION public.get_decrypted_credentials()
RETURNS TABLE(
  id uuid, title text, username text, password text, notes text,
  category text, metadata jsonb, service_url text, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT public.current_user_has_any_group(ARRAY['it_management']) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.id, c.title, c.username,
         extensions.pgp_sym_decrypt(decode(c.password, 'base64'), 'GESIT-PASS-2026'),
         c.notes, c.category, c.metadata, c.service_url, c.created_at
  FROM public.credentials c;
END;
$$;
REVOKE ALL ON FUNCTION public.get_decrypted_credentials() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_decrypted_credentials() TO authenticated, service_role;

COMMIT;
