alter table public.user_accounts
  add column if not exists birth_place text,
  add column if not exists gender text,
  add column if not exists marital_status text,
  add column if not exists religion text,
  add column if not exists blood_type text,
  add column if not exists nik text,
  add column if not exists npwp text,
  add column if not exists passport_number text,
  add column if not exists residential_address text,
  add column if not exists bpjs_tk_number text,
  add column if not exists bpjs_health_number text,
  add column if not exists grade_class text;
