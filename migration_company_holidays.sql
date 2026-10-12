-- Company holiday master. HR may override official SKB/API dates per company policy.
create table if not exists public.company_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null,
  name text not null,
  holiday_type text not null default 'national' check (holiday_type in ('national','company','collective_leave','working_day')),
  deduct_annual_leave boolean not null default false,
  source text not null default 'company_policy' check (source in ('skb','api','company_policy')),
  is_active boolean not null default true,
  notes text,
  created_by bigint,
  updated_by bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (holiday_date, name)
);

create index if not exists company_holidays_date_idx on public.company_holidays (holiday_date) where is_active;
alter table public.company_holidays enable row level security;

drop policy if exists company_holidays_authenticated_read on public.company_holidays;
drop policy if exists company_holidays_hr_insert on public.company_holidays;
drop policy if exists company_holidays_hr_update on public.company_holidays;
drop policy if exists company_holidays_hr_delete on public.company_holidays;
drop policy if exists company_holidays_all_authenticated on public.company_holidays;

create policy company_holidays_all_authenticated on public.company_holidays
for all to authenticated
using (true)
with check (true);
