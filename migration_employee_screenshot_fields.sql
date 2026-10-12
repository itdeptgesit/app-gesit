alter table public.user_accounts
  add column if not exists branch text;

update public.user_accounts
set
  phone = '089651035509',
  birth_place = 'Bandung',
  date_of_birth = '1996-12-10',
  gender = 'Male',
  marital_status = 'Single',
  blood_type = null,
  religion = 'Islam',
  nik = '3204251012960009',
  npwp = null,
  passport_number = null,
  residential_address = 'Kp Sindangsari, RT 002/RW 009, Desa Ciluluk, Kecamatan Cikancung',
  address = 'Kp Sindangsari, RT 002/RW 009, Desa Ciluluk, Kecamatan Cikancung',
  employee_code = '25060382',
  company = 'PT. Gesit Perkasa',
  branch = 'Gesit Alumas',
  department = 'HR & Logistics',
  job_title = 'Teknisi IT',
  job_level = 'Staff',
  employment_type = 'Permanent',
  join_date = '2025-06-02',
  grade_class = null,
  manager_id = '25040379',
  payroll_status = 'Active',
  bank_name = 'BCA',
  bank_account_name = 'RUDI SIARUDIN',
  bank_account_number = '5730370395',
  tax_status = 'TK/0',
  bpjs_tk_number = null,
  bpjs_health_number = null
where lower(email) = lower('rudi.siarudin@gesit.co.id');
