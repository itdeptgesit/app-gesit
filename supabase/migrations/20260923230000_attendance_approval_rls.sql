-- Phase 3: ownership and approver-scoped RLS for attendance workflows.
-- No business rows are modified or deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_can_access_employee(target_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    target_user_id = public.current_user_account_id()::text
    OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd','csl_admin'])
    OR EXISTS (
      SELECT 1
      FROM public.user_accounts target
      WHERE target.id::text = target_user_id
        AND public.current_user_account_id()::text = ANY(ARRAY[
          NULLIF(target.supervisor_id, ''),
          NULLIF(target.manager_id, ''),
          NULLIF(target.vp_id, ''),
          NULLIF(target.attendance_supervisor_id, ''),
          NULLIF(target.attendance_hr_id, ''),
          NULLIF(target.attendance_manager_id, ''),
          NULLIF(target.attendance_vp_id, '')
        ])
    ), false
  )
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_request(target_type text, target_request_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_user_id text;
BEGIN
  CASE lower(target_type)
    WHEN 'leave' THEN
      SELECT user_id INTO target_user_id FROM public.leave_requests WHERE id::text = target_request_id LIMIT 1;
    WHEN 'overtime' THEN
      SELECT user_id INTO target_user_id FROM public.overtime_requests WHERE id::text = target_request_id LIMIT 1;
    WHEN 'reimbursement' THEN
      SELECT user_id INTO target_user_id FROM public.reimbursements WHERE id::text = target_request_id LIMIT 1;
    ELSE
      RETURN false;
  END CASE;
  RETURN public.current_user_can_access_employee(target_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_can_access_employee(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_access_request(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_employee(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_request(text, text) TO authenticated, service_role;

-- Existing sessions with a legacy NULL auth_id still resolve through JWT email.
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
CREATE POLICY user_sessions_owner_select ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = public.current_user_account_id());
CREATE POLICY user_sessions_owner_insert ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_account_id());
CREATE POLICY user_sessions_owner_update ON public.user_sessions FOR UPDATE TO authenticated
  USING (user_id = public.current_user_account_id())
  WITH CHECK (user_id = public.current_user_account_id());
CREATE POLICY user_sessions_owner_delete ON public.user_sessions FOR DELETE TO authenticated
  USING (user_id = public.current_user_account_id());

-- Attendance rows: employee owns clock records; HR/management can administer.
DROP POLICY IF EXISTS security_authenticated_access ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_select ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_insert ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_update ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_delete ON public.attendance_records;
CREATE POLICY attendance_records_select ON public.attendance_records FOR SELECT TO authenticated
  USING (public.current_user_can_access_employee(user_id));
CREATE POLICY attendance_records_insert ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_user_account_id()::text
    OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
  );
CREATE POLICY attendance_records_update ON public.attendance_records FOR UPDATE TO authenticated
  USING (public.current_user_can_access_employee(user_id))
  WITH CHECK (public.current_user_can_access_employee(user_id));
CREATE POLICY attendance_records_delete ON public.attendance_records FOR DELETE TO authenticated
  USING (
    user_id = public.current_user_account_id()::text
    OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
  );

-- Request tables share the same user_id ownership and approval hierarchy.
DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['leave_requests','overtime_requests','reimbursements']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS security_authenticated_access ON public.%I', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_select', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_insert', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_update', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_delete', target_table);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.current_user_can_access_employee(user_id))',
      target_table || '_select', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = public.current_user_account_id()::text)',
      target_table || '_insert', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.current_user_can_access_employee(user_id)) WITH CHECK (public.current_user_can_access_employee(user_id))',
      target_table || '_update', target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (user_id = public.current_user_account_id()::text OR public.current_user_has_any_group(ARRAY[''it_management'',''hr'',''hrd'']))',
      target_table || '_delete', target_table
    );
  END LOOP;
END $$;

-- Approval trail visibility follows the linked request. Only approvers/admins may write.
DROP POLICY IF EXISTS security_authenticated_access ON public.approval_records;
DROP POLICY IF EXISTS approval_records_scoped_select ON public.approval_records;
DROP POLICY IF EXISTS approval_records_approver_insert ON public.approval_records;
DROP POLICY IF EXISTS approval_records_approver_update ON public.approval_records;
DROP POLICY IF EXISTS approval_records_management_delete ON public.approval_records;
CREATE POLICY approval_records_scoped_select ON public.approval_records FOR SELECT TO authenticated
  USING (public.current_user_can_access_request(request_type, request_id));
CREATE POLICY approval_records_approver_insert ON public.approval_records FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can_access_request(request_type, request_id)
    AND (
      approver_id IS NULL
      OR approver_id = public.current_user_account_id()::text
      OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
    )
  );
CREATE POLICY approval_records_approver_update ON public.approval_records FOR UPDATE TO authenticated
  USING (
    approver_id = public.current_user_account_id()::text
    OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
  )
  WITH CHECK (
    public.current_user_can_access_request(request_type, request_id)
    AND (
      approver_id = public.current_user_account_id()::text
      OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
    )
  );
CREATE POLICY approval_records_management_delete ON public.approval_records FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));

-- Hierarchy assignments are visible only to involved employees/approvers and HR.
DROP POLICY IF EXISTS security_authenticated_access ON public.supervisor_assignments;
DROP POLICY IF EXISTS supervisor_assignments_scoped_select ON public.supervisor_assignments;
DROP POLICY IF EXISTS supervisor_assignments_management_insert ON public.supervisor_assignments;
DROP POLICY IF EXISTS supervisor_assignments_management_update ON public.supervisor_assignments;
DROP POLICY IF EXISTS supervisor_assignments_management_delete ON public.supervisor_assignments;
CREATE POLICY supervisor_assignments_scoped_select ON public.supervisor_assignments FOR SELECT TO authenticated
  USING (
    staff_id = public.current_user_account_id()
    OR supervisor_id = public.current_user_account_id()
    OR public.current_user_has_any_group(ARRAY['it_management','hr','hrd'])
  );
CREATE POLICY supervisor_assignments_management_insert ON public.supervisor_assignments FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));
CREATE POLICY supervisor_assignments_management_update ON public.supervisor_assignments FOR UPDATE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']))
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));
CREATE POLICY supervisor_assignments_management_delete ON public.supervisor_assignments FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));

-- Attendance settings are readable by employees, writable by HR/management only.
DROP POLICY IF EXISTS security_authenticated_access ON public.attendance_settings;
DROP POLICY IF EXISTS attendance_settings_select ON public.attendance_settings;
DROP POLICY IF EXISTS attendance_settings_management_insert ON public.attendance_settings;
DROP POLICY IF EXISTS attendance_settings_management_update ON public.attendance_settings;
DROP POLICY IF EXISTS attendance_settings_management_delete ON public.attendance_settings;
CREATE POLICY attendance_settings_select ON public.attendance_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY attendance_settings_management_insert ON public.attendance_settings FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));
CREATE POLICY attendance_settings_management_update ON public.attendance_settings FOR UPDATE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']))
  WITH CHECK (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));
CREATE POLICY attendance_settings_management_delete ON public.attendance_settings FOR DELETE TO authenticated
  USING (public.current_user_has_any_group(ARRAY['it_management','hr','hrd']));

COMMIT;
