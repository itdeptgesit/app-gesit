-- ============================================================
-- STEP 1: Buat tabel approval (jalankan di Supabase SQL Editor)
-- ============================================================

-- 1. Tabel level approval
CREATE TABLE IF NOT EXISTS approval_levels (
  id SERIAL PRIMARY KEY,
  level_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  required_role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel approval records
CREATE TABLE IF NOT EXISTS approval_records (
  id SERIAL PRIMARY KEY,
  request_type TEXT NOT NULL,
  request_id INT NOT NULL,
  level_number INT NOT NULL,
  approver_id INT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_type, request_id, level_number)
);

-- 3. Tabel supervisor assignments
CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL UNIQUE,
  supervisor_id INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tambah kolom approval ke leave_requests
ALTER TABLE leave_requests 
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- 5. Tambah kolom approval ke overtime_requests
ALTER TABLE overtime_requests 
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- 6. Seed approval levels
INSERT INTO approval_levels (level_number, name, required_role) VALUES
  (1, 'Supervisor', 'supervisor'),
  (2, 'Senior Supervisor', 'senior_supervisor'),
  (3, 'HR / Management', 'hr'),
  (4, 'Office Management', 'office_management')
ON CONFLICT (level_number) DO NOTHING;

-- 7. Index
CREATE INDEX IF NOT EXISTS idx_approval_records_request ON approval_records(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON approval_records(status, level_number);

-- 8. RLS
ALTER TABLE approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read approval_levels" ON approval_levels;
DROP POLICY IF EXISTS "read approval_records" ON approval_records;
DROP POLICY IF EXISTS "insert approval_records" ON approval_records;
DROP POLICY IF EXISTS "update approval_records" ON approval_records;
DROP POLICY IF EXISTS "read supervisor_assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "manage supervisor_assignments" ON supervisor_assignments;

CREATE POLICY "read approval_levels" ON approval_levels FOR SELECT USING (true);
CREATE POLICY "read approval_records" ON approval_records FOR SELECT USING (true);
CREATE POLICY "insert approval_records" ON approval_records FOR INSERT WITH CHECK (true);
CREATE POLICY "update approval_records" ON approval_records FOR UPDATE USING (true);
CREATE POLICY "read supervisor_assignments" ON supervisor_assignments FOR SELECT USING (true);
CREATE POLICY "manage supervisor_assignments" ON supervisor_assignments FOR ALL USING (true);

-- Selesai!
SELECT 'Migration approval hierarchy berhasil!' as result;
