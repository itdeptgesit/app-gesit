-- ==============================================================================
-- MIGRATION: Sync Kolom Approval antara app-gesit (web) dan app-absen (PWA)
-- Satu skrip idempotent siap-jalan (aman dijalankan ulang).
-- Urutan: (1) kolom profile hierarki, (2) kolom approval_status, (3) kolom history,
--         (4) backfill data lama dari kolom `status` -> `approval_status`.
-- Jalankan di Supabase SQL Editor.
-- ==============================================================================

-- (1) 4 kolom hierarki attendance di user_accounts
--     Level 1 SPV -> Level 2 HR -> Level 3 Manager/Deputy -> Level 4 VP
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS attendance_supervisor_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_hr_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_manager_id TEXT,
  ADD COLUMN IF NOT EXISTS attendance_vp_id TEXT;

-- (2) Kolom yang dibaca/ditulis app-absen (PWA) pada tiap tabel pengajuan.
--     leave_requests & overtime_requests biasanya sudah ada; IF NOT EXISTS aman.
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1;

ALTER TABLE public.overtime_requests
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1;

ALTER TABLE public.reimbursements
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1;

-- (3) Kolom history approval per level (agar riwayat per-approver tersimpan)
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

ALTER TABLE public.overtime_requests
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

ALTER TABLE public.reimbursements
  ADD COLUMN IF NOT EXISTS line1_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line1_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS line2_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS line2_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senior_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS senior_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS office_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS office_approved_at TIMESTAMPTZ;

-- (4) Backfill data lama dari kolom `status` -> `approval_status`
--     (hanya baris yang approval_status-nya masih kosong/'pending' agar
--      tidak mengtimpa approval_status yang sudah benar)
UPDATE public.leave_requests
   SET approval_status = 'approved'
 WHERE status = 'approved'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.overtime_requests
   SET approval_status = 'approved'
 WHERE status = 'approved'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.reimbursements
   SET approval_status = 'approved'
 WHERE status IN ('approved', 'paid')
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.leave_requests
   SET approval_status = 'rejected'
 WHERE status = 'rejected'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.overtime_requests
   SET approval_status = 'rejected'
 WHERE status = 'rejected'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.reimbursements
   SET approval_status = 'rejected'
 WHERE status = 'rejected'
   AND (approval_status IS NULL OR approval_status = 'pending');

-- Nilai intermediate yang ditulis oleh app-gesit (kolom `status`)
UPDATE public.leave_requests
   SET approval_status = 'pending_level_2', current_approval_level = 2
 WHERE status = 'pending_line_2'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.overtime_requests
   SET approval_status = 'pending_level_2', current_approval_level = 2
 WHERE status = 'pending_line_2'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.reimbursements
   SET approval_status = 'pending_level_2', current_approval_level = 2
 WHERE status = 'pending_line_2'
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.leave_requests
   SET approval_status = 'pending_level_3', current_approval_level = 3
 WHERE status IN ('pending_senior', 'pending_office')
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.overtime_requests
   SET approval_status = 'pending_level_3', current_approval_level = 3
 WHERE status IN ('pending_senior', 'pending_office')
   AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE public.reimbursements
   SET approval_status = 'pending_level_3', current_approval_level = 3
 WHERE status IN ('pending_senior', 'pending_office')
   AND (approval_status IS NULL OR approval_status = 'pending');

-- Muat ulang skema PostgREST agar kolom baru langsung terdeteksi
NOTIFY pgrst, 'reload schema';