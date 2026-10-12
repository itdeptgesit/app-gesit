-- ==============================================================================
-- BACKFILL: Mengisi kolom history approval per-level dari tabel approval_records
-- (tabel yang dipakai app-absen / PWA untuk mencatat tiap keputusan level).
--
-- Pemetaan level:
--   level_number 1 -> line1_approved_by / line1_approved_at   (Supervisor/SPV)
--   level_number 2 -> line2_approved_by / line2_approved_at   (HR)
--   level_number 3 -> senior_approved_by / senior_approved_at (Manager)
--   level_number 4 -> office_approved_by / office_approved_at (VP)
--
-- Hanya mengisi baris yang masih kosong (tidak menimpa data yang sudah ada).
-- Idempotent — aman dijalankan ulang. Jalankan di Supabase SQL Editor.
-- ==============================================================================

-- ── 1. leave_requests ─────────────────────────────────────────────────────────
UPDATE public.leave_requests AS ll
SET line1_approved_by = ar.approver_name,
    line1_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'leave'
  AND ar.request_id = ll.id::text
  AND ar.level_number = 1
  AND ar.status = 'approved'
  AND ll.line1_approved_by IS NULL;

UPDATE public.leave_requests AS ll
SET line2_approved_by = ar.approver_name,
    line2_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'leave'
  AND ar.request_id = ll.id::text
  AND ar.level_number = 2
  AND ar.status = 'approved'
  AND ll.line2_approved_by IS NULL;

UPDATE public.leave_requests AS ll
SET senior_approved_by = ar.approver_name,
    senior_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'leave'
  AND ar.request_id = ll.id::text
  AND ar.level_number = 3
  AND ar.status = 'approved'
  AND ll.senior_approved_by IS NULL;

UPDATE public.leave_requests AS ll
SET office_approved_by = ar.approver_name,
    office_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'leave'
  AND ar.request_id = ll.id::text
  AND ar.level_number = 4
  AND ar.status = 'approved'
  AND ll.office_approved_by IS NULL;

-- ── 2. overtime_requests ──────────────────────────────────────────────────────
UPDATE public.overtime_requests AS ot
SET line1_approved_by = ar.approver_name,
    line1_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'overtime'
  AND ar.request_id = ot.id::text
  AND ar.level_number = 1
  AND ar.status = 'approved'
  AND ot.line1_approved_by IS NULL;

UPDATE public.overtime_requests AS ot
SET line2_approved_by = ar.approver_name,
    line2_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'overtime'
  AND ar.request_id = ot.id::text
  AND ar.level_number = 2
  AND ar.status = 'approved'
  AND ot.line2_approved_by IS NULL;

UPDATE public.overtime_requests AS ot
SET senior_approved_by = ar.approver_name,
    senior_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'overtime'
  AND ar.request_id = ot.id::text
  AND ar.level_number = 3
  AND ar.status = 'approved'
  AND ot.senior_approved_by IS NULL;

UPDATE public.overtime_requests AS ot
SET office_approved_by = ar.approver_name,
    office_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'overtime'
  AND ar.request_id = ot.id::text
  AND ar.level_number = 4
  AND ar.status = 'approved'
  AND ot.office_approved_by IS NULL;

-- ── 3. reimbursements ─────────────────────────────────────────────────────────
UPDATE public.reimbursements AS rb
SET line1_approved_by = ar.approver_name,
    line1_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'reimbursement'
  AND ar.request_id = rb.id::text
  AND ar.level_number = 1
  AND ar.status = 'approved'
  AND rb.line1_approved_by IS NULL;

UPDATE public.reimbursements AS rb
SET line2_approved_by = ar.approver_name,
    line2_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'reimbursement'
  AND ar.request_id = rb.id::text
  AND ar.level_number = 2
  AND ar.status = 'approved'
  AND rb.line2_approved_by IS NULL;

UPDATE public.reimbursements AS rb
SET senior_approved_by = ar.approver_name,
    senior_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'reimbursement'
  AND ar.request_id = rb.id::text
  AND ar.level_number = 3
  AND ar.status = 'approved'
  AND rb.senior_approved_by IS NULL;

UPDATE public.reimbursements AS rb
SET office_approved_by = ar.approver_name,
    office_approved_at = ar.decided_at
FROM public.approval_records AS ar
WHERE ar.request_type = 'reimbursement'
  AND ar.request_id = rb.id::text
  AND ar.level_number = 4
  AND ar.status = 'approved'
  AND rb.office_approved_by IS NULL;

-- Muat ulang skema PostgREST (tidak mengubah struktur, sekadar safety)
NOTIFY pgrst, 'reload schema';