-- MIGRATION: Kolom Employment Info untuk user_accounts
-- Tambahkan kolom employee_code, join_date, job_level untuk data kepegawaian
-- yang diisi oleh HR dari dashboard ERP.

ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS join_date DATE,
  ADD COLUMN IF NOT EXISTS job_level TEXT;

-- Backfill employee_code dari username untuk data existing
UPDATE public.user_accounts
SET employee_code = username
WHERE employee_code IS NULL AND username IS NOT NULL;

COMMENT ON COLUMN public.user_accounts.employee_code IS 'Nomor induk karyawan / employee ID (diisi HR)';
COMMENT ON COLUMN public.user_accounts.join_date IS 'Tanggal bergabung / join date (diisi HR)';
COMMENT ON COLUMN public.user_accounts.job_level IS 'Level jabatan: Staff / Supervisor / Manager / VP (diisi HR)';