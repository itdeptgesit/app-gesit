-- ============================================================
-- SINGLE CLEAN MIGRATION: Approval system fix
-- Jalankan di Supabase SQL Editor — urutan sudah benar
-- ============================================================

-- 1. approval_records: tambah kolom approver_name (skip kalau sudah ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_records' AND column_name = 'approver_name'
  ) THEN
    ALTER TABLE approval_records ADD COLUMN approver_name TEXT;
  END IF;
END $$;

-- 2. Ubah request_id dari INT ke TEXT (untuk support UUID dari reimbursements)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'approval_records'
    AND column_name = 'request_id'
    AND data_type = 'integer'
  ) THEN
    -- Drop unique constraint dulu
    ALTER TABLE approval_records
      DROP CONSTRAINT IF EXISTS approval_records_request_type_request_id_level_number_key;
    -- Ubah tipe
    ALTER TABLE approval_records
      ALTER COLUMN request_id TYPE TEXT USING request_id::TEXT;
    -- Recreate constraint
    ALTER TABLE approval_records
      ADD CONSTRAINT approval_records_request_type_request_id_level_number_key
      UNIQUE (request_type, request_id, level_number);
  END IF;
END $$;

-- 3. reimbursements: tambah kolom approval (skip kalau sudah ada)
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

-- 4. Update approval_records.approver_name dari user_accounts
UPDATE approval_records ar
SET approver_name = ua.full_name
FROM user_accounts ua
WHERE ar.approver_name IS NULL
  AND ar.approver_id::TEXT = ua.id::TEXT;

-- 5. Update reimbursements.approval_status dari status
UPDATE reimbursements
SET approval_status = CASE
  WHEN status = 'approved' THEN 'approved'
  WHEN status = 'rejected' THEN 'rejected'
  ELSE 'pending'
END
WHERE approval_status IS NULL
   OR (approval_status = 'pending' AND status IN ('approved', 'rejected'));

-- 6. Leave quotas (jika belum ada)
CREATE TABLE IF NOT EXISTS leave_quotas (
  id SERIAL PRIMARY KEY,
  leave_type TEXT NOT NULL UNIQUE,
  max_days INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'read leave_quotas'
  ) THEN
    CREATE POLICY "read leave_quotas" ON leave_quotas FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'manage leave_quotas'
  ) THEN
    CREATE POLICY "manage leave_quotas" ON leave_quotas FOR ALL USING (true);
  END IF;
END $$;

INSERT INTO leave_quotas (leave_type, max_days, description) VALUES
  ('annual', 12, 'Cuti tahunan'),
  ('compensatory', 0, 'Cuti pengganti'),
  ('marriage', 3, 'Cuti menikah'),
  ('bereavement', 3, 'Cuti duka'),
  ('sick', 12, 'Izin sakit'),
  ('personal', 3, 'Cuti pribadi'),
  ('maternity', 90, 'Cuti melahirkan'),
  ('paternity', 5, 'Cuti ayah'),
  ('unpaid', 0, 'Cuti tanpa gaji'),
  ('other', 0, 'Lainnya')
ON CONFLICT (leave_type) DO UPDATE SET
  max_days = EXCLUDED.max_days,
  description = EXCLUDED.description;

-- ============================================================
-- SELESAI — cek hasil:
-- ============================================================
SELECT 'approval_records' as tbl,
  column_name, data_type
FROM information_schema.columns
WHERE table_name = 'approval_records'
ORDER BY ordinal_position;

SELECT 'reimbursements_approval' as info,
  approval_status, current_approval_level
FROM reimbursements LIMIT 3;

SELECT 'leave_quotas' as info, leave_type, max_days FROM leave_quotas ORDER BY id;
