-- HR employee master-data write access.
-- Nisa uses employee-data + attendance-request groups; keep role restricted to User.
drop policy if exists "hr_employee_insert" on public.user_accounts;
create policy "hr_employee_insert"
on public.user_accounts
for insert to authenticated
with check (
  current_user_has_any_group(array[
    'hr'::text, 'hrd'::text, 'employee-data'::text,
    'attendance-request'::text, 'attendance_request'::text
  ])
  and lower(trim(coalesce(role, 'user'))) = 'user'
);

drop policy if exists "hr_employee_update" on public.user_accounts;
create policy "hr_employee_update"
on public.user_accounts
for update to authenticated
using (
  current_user_has_any_group(array[
    'hr'::text, 'hrd'::text, 'employee-data'::text,
    'attendance-request'::text, 'attendance_request'::text
  ])
)
with check (
  current_user_has_any_group(array[
    'hr'::text, 'hrd'::text, 'employee-data'::text,
    'attendance-request'::text, 'attendance_request'::text
  ])
  and lower(trim(coalesce(role, 'user'))) = 'user'
);
