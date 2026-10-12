-- GESIT HR: Data Employee + Calendar support
-- Jalankan di Supabase SQL Editor.
-- Idempotent: aman dijalankan ulang.

BEGIN;

-- 1. Field master data employee.
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS employee_code text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS join_date date,
  ADD COLUMN IF NOT EXISTS job_level text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS contract_type text,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS pkwt_number text,
  ADD COLUMN IF NOT EXISTS payroll_status text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS tax_status text;

-- Employee ID unik bila sudah terisi.
CREATE UNIQUE INDEX IF NOT EXISTS user_accounts_employee_code_uidx
  ON public.user_accounts (employee_code)
  WHERE employee_code IS NOT NULL AND employee_code <> '';

CREATE INDEX IF NOT EXISTS user_accounts_date_of_birth_idx
  ON public.user_accounts (date_of_birth)
  WHERE date_of_birth IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_accounts_contract_end_date_idx
  ON public.user_accounts (contract_end_date)
  WHERE contract_end_date IS NOT NULL;

COMMENT ON COLUMN public.user_accounts.bank_account_number IS
  'Sensitive payroll field. UI wajib masking; jangan tampilkan ke employee lain.';

-- 2. Kalender employee memakai data yang sudah ada:
--    attendance_records, leave_requests, user_accounts.date_of_birth,
--    dan fallback holiday SKB di frontend.
--    Tidak membuat tabel holiday eksternal agar sumber holiday tetap konsisten.

-- 3. Pastikan RLS employee tidak terbuka untuk publik.
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Policy existing tidak dihapus. Policy ini hanya memberi employee akses
-- baca row miliknya berdasarkan email JWT. HR/Admin memakai policy existing
-- atau service role yang sudah dikonfigurasi.
DROP POLICY IF EXISTS employee_read_own_profile ON public.user_accounts;
CREATE POLICY employee_read_own_profile
  ON public.user_accounts
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

COMMIT;

-- Verifikasi setelah execute:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_accounts'
  AND column_name IN (
    'employee_code', 'date_of_birth', 'join_date', 'job_level',
    'employment_type', 'contract_type', 'contract_start_date',
    'contract_end_date', 'pkwt_number', 'payroll_status',
    'bank_name', 'bank_account_name', 'bank_account_number', 'tax_status'
  )
ORDER BY column_name;
