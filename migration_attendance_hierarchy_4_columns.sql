-- ==============================================================================
-- MIGRATION: Add Attendance Approval Hierarchy Columns to user_accounts
-- Flow: Direct Supervisor (SPV) -> HR -> Manager/Deputy -> VP
-- Khusus untuk pengajuan Cuti, Lembur, dan Request di PWA Absen
-- ==============================================================================

-- 1. Tambahkan 4 kolom approval attendance di tabel user_accounts
--    (disimpan sebagai ID user_accounts, bukan employee_id)
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS attendance_supervisor_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_hr_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_manager_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_vp_id TEXT;

-- 2. Muat ulang skema PostgREST Supabase
NOTIFY pgrst, 'reload schema';