-- ============================================================
-- MIGRATION: GESIT Attendance 4-Level Approval
--
-- Level 1 — Direct Supervisor (SPV)   -> attendance_supervisor_id
-- Level 2 — HR Approver               -> attendance_hr_id
-- Level 3 — Manager / Deputy          -> attendance_manager_id
-- Level 4 — VP                        -> attendance_vp_id
--
-- Kolom profil approver ditambahkan lewat migration_attendance_hierarchy_4_columns.sql
-- File ini hanya menambahkan kolom history approval per level pada tiap tabel pengajuan.
-- Jalankan di Supabase SQL Editor.
-- ============================================================

-- Kolom history approval per level pada tiap tabel pengajuan
--    cuti
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

--    lembur
ALTER TABLE public.overtime_requests
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

--    reimbursement
ALTER TABLE public.reimbursements
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

-- Muat ulang skema PostgREST agar kolom baru langsung terdeteksi
NOTIFY pgrst, 'reload schema';