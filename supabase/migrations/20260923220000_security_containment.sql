-- Emergency security containment: remove anonymous access and destructive RPC grants.
-- This migration intentionally preserves existing authenticated workflows while
-- closing unauthenticated access. Fine-grained authenticated policies follow.

BEGIN;

-- Destructive maintenance RPCs must never be callable from browser roles.
REVOKE ALL ON FUNCTION public.wipe_table(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wipe_tables(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wipe_table(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.wipe_tables(text[]) TO service_role;

-- user_sessions contains IP/device/session identifiers. Restore RLS and ownership.
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_authenticated_all" ON public.user_sessions;

CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.id = user_sessions.user_id AND ua.auth_id = auth.uid()
));
CREATE POLICY "Users can insert their own sessions"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.id = user_sessions.user_id AND ua.auth_id = auth.uid()
));
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.id = user_sessions.user_id AND ua.auth_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.id = user_sessions.user_id AND ua.auth_id = auth.uid()
));
CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_accounts ua
  WHERE ua.id = user_sessions.user_id AND ua.auth_id = auth.uid()
));
REVOKE ALL ON public.user_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

-- Remove known anonymous full-access policies.
DROP POLICY IF EXISTS "Allow all actions for anonymous users" ON public.purchase_requisitions;
DROP POLICY IF EXISTS "Allow all actions for anonymous users" ON public.purchase_budgets;
DROP POLICY IF EXISTS "Allow all actions for anonymous users" ON public.it_asset_handovers;
DROP POLICY IF EXISTS "p1" ON public.attendance_schedules;
DROP POLICY IF EXISTS "p2" ON public.employee_schedules;
DROP POLICY IF EXISTS "p3" ON public.office_locations;
DROP POLICY IF EXISTS "p4" ON public.attendance_records;
DROP POLICY IF EXISTS "p5" ON public.leave_requests;
DROP POLICY IF EXISTS "p6" ON public.overtime_requests;
DROP POLICY IF EXISTS "p7" ON public.attendance_settings;
DROP POLICY IF EXISTS "p8" ON public.reimbursements;
DROP POLICY IF EXISTS "reimbursements_select" ON public.reimbursements;
DROP POLICY IF EXISTS "reimbursements_insert" ON public.reimbursements;
DROP POLICY IF EXISTS "reimbursements_update" ON public.reimbursements;
DROP POLICY IF EXISTS "reimbursements_delete" ON public.reimbursements;
DROP POLICY IF EXISTS "read approval_records" ON public.approval_records;
DROP POLICY IF EXISTS "insert approval_records" ON public.approval_records;
DROP POLICY IF EXISTS "update approval_records" ON public.approval_records;
DROP POLICY IF EXISTS "read supervisor_assignments" ON public.supervisor_assignments;
DROP POLICY IF EXISTS "manage supervisor_assignments" ON public.supervisor_assignments;

-- Explicitly revoke browser-anonymous privileges on sensitive tables.
REVOKE ALL ON TABLE
  public.user_accounts,
  public.user_sessions,
  public.purchase_requisitions,
  public.purchase_budgets,
  public.it_asset_handovers,
  public.attendance_records,
  public.leave_requests,
  public.overtime_requests,
  public.reimbursements,
  public.attendance_settings,
  public.approval_records,
  public.supervisor_assignments,
  public.activity_logs,
  public.user_activity_logs,
  public.credentials
FROM anon;

-- Restore authenticated-only access for existing application workflows.
-- These are containment policies; ownership/approver-specific policies can be
-- tightened module-by-module after regression tests.
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.it_asset_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_assignments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'purchase_requisitions','purchase_budgets','it_asset_handovers',
    'attendance_records','leave_requests','overtime_requests','reimbursements',
    'attendance_settings','approval_records','supervisor_assignments'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'security_authenticated_access', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'security_authenticated_access', table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END $$;

-- CSL tables: block anon immediately while keeping authenticated app access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'csl_request_categories','csl_requests','csl_request_documents','csl_request_logs',
    'csl_routines','csl_routine_instances','csl_routine_comments','csl_tasks',
    'csl_rups_ar','csl_contacts','csl_documents','csl_expense_approvals',
    'csl_offshore_invoices','csl_budget_allocations','csl_system_settings',
    'office_layout_markers'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'security_authenticated_access', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        'security_authenticated_access', table_name
      );
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
