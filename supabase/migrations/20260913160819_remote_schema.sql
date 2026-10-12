-- Reimbursement (medical claims) table
-- Used by PWA (app-absen) PaymentPage and web dashboard (AttendanceManager)

create table if not exists public.reimbursements (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  category    text not null default 'medical_general',
  amount      numeric not null default 0,
  date        date,
  description text not null default '',
  status      text not null default 'pending',
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_reimbursements_user_id on public.reimbursements (user_id);
create index if not exists idx_reimbursements_status on public.reimbursements (status);

-- RLS: mirror existing attendance tables (anon key access for both PWA and web dashboard)
alter table public.reimbursements enable row level security;

-- Allow all operations via anon/authenticated (matches leave_requests pattern)
create policy "reimbursements_select" on public.reimbursements
  for select using (true);

create policy "reimbursements_insert" on public.reimbursements
  for insert with check (true);

create policy "reimbursements_update" on public.reimbursements
  for update using (true) with check (true);

create policy "reimbursements_delete" on public.reimbursements
  for delete using (true);
