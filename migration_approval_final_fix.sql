-- ============================================================
-- FINAL FIX: Approval records system
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Ubah request_id dari INT ke TEXT (support UUID dari leave_requests)
DO $$
BEGIN
  -- Drop unique constraint dulu
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'approval_records_request_type_request_id_level_number_key'
  ) THEN
    ALTER TABLE approval_records
      DROP CONSTRAINT approval_records_request_type_request_id_level_number_key;
  END IF;

  -- Ubah tipe kalau masih integer
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_records'
    AND column_name = 'request_id'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE approval_records
      ALTER COLUMN request_id TYPE TEXT USING request_id::TEXT;
  END IF;

  -- Recreate constraint
  ALTER TABLE approval_records
    ADD CONSTRAINT approval_records_request_type_request_id_level_number_key
    UNIQUE (request_type, request_id, level_number);
END $$;

-- 2. Tambah approval_status + current_approval_level ke reimbursements (kalau belum)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reimbursements' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE reimbursements ADD COLUMN approval_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reimbursements' AND column_name = 'current_approval_level'
  ) THEN
    ALTER TABLE reimbursements ADD COLUMN current_approval_level INT DEFAULT 1;
  END IF;
END $$;

-- 3. Sinkronkan leave_requests yang sudah approved ke approval_records
--    (untuk approval yang terjadi langsung dari ERP/dashboard)
INSERT INTO approval_records (request_type, request_id, level_number, approver_id, approver_name, status, decided_at)
SELECT
  'leave' AS request_type,
  lr.id::TEXT AS request_id,
  1 AS level_number,
  1 AS approver_id,
  lr.approved_by AS approver_name,
  lr.status,
  lr.approved_at
FROM leave_requests lr
WHERE lr.status = 'approved'
  AND lr.approved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_records ar
    WHERE ar.request_type = 'leave'
    AND ar.request_id = lr.id::TEXT
    AND ar.level_number = 1
  )
ON CONFLICT (request_type, request_id, level_number) DO NOTHING;

-- 4. Hapus record test yang salah
DELETE FROM approval_records WHERE approver_name = 'Test';

-- 5. Cek hasil
SELECT
  ar.id,
  ar.request_type,
  ar.request_id,
  ar.level_number,
  ar.approver_name,
  ar.status,
  ar.decided_at
FROM approval_records ar
ORDER BY ar.decided_at DESC;
