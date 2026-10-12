-- ============================================================
-- MIGRATION: Multi-Level Approval Hierarchy
-- Staff → Supervisor → HR → Office Management
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. Tabel level approval (definisi hirarki)
CREATE TABLE IF NOT EXISTS approval_levels (
  id SERIAL PRIMARY KEY,
  level_number INT NOT NULL UNIQUE,       -- 1=Supervisor, 2=HR, 3=Office Mgmt
  name TEXT NOT NULL,                      -- 'Supervisor', 'HR', 'Office Management'
  required_role TEXT NOT NULL,             -- role yang boleh approve di level ini
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel approval records (keputusan tiap level per pengajuan)
CREATE TABLE IF NOT EXISTS approval_records (
  id SERIAL PRIMARY KEY,
  request_type TEXT NOT NULL,              -- 'leave', 'overtime', 'reimbursement'
  request_id INT NOT NULL,                -- id dari leave_requests / overtime_requests / reimbursements
  level_number INT NOT NULL REFERENCES approval_levels(id),
  approver_id INT REFERENCES user_accounts(id),  -- siapa yang approve
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_type, request_id, level_number)
);

-- 3. Tambah kolom current_approval_level ke tabel pengajuan
ALTER TABLE leave_requests 
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'pending_level_2', 'pending_level_3', 'approved', 'rejected'));

ALTER TABLE overtime_requests 
  ADD COLUMN IF NOT EXISTS current_approval_level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
    CHECK (approval_status IN ('pending', 'pending_level_2', 'pending_level_3', 'approved', 'rejected'));

-- 4. Tabel supervisor assignments (siapa staff punya supervisor siapa)
CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id SERIAL PRIMARY KEY,
  staff_id INT NOT NULL REFERENCES user_accounts(id) UNIQUE,
  supervisor_id INT REFERENCES user_accounts(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Seed approval levels
INSERT INTO approval_levels (level_number, name, required_role) VALUES
  (1, 'Supervisor', 'supervisor'),
  (2, 'HR', 'hr'),
  (3, 'Office Management', 'office_management')
ON CONFLICT (level_number) DO NOTHING;

-- 6. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_approval_records_request 
  ON approval_records(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status 
  ON approval_records(status, level_number);

-- 7. RLS policies
ALTER TABLE approval_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- Everyone can read approval levels
CREATE POLICY "read approval_levels" ON approval_levels FOR SELECT USING (true);

-- Approvers can read and update their level's records
CREATE POLICY "read approval_records" ON approval_records FOR SELECT USING (true);
CREATE POLICY "insert approval_records" ON approval_records FOR INSERT WITH CHECK (true);
CREATE POLICY "update approval_records" ON approval_records FOR UPDATE USING (true);

-- Users can read their own supervisor assignments
CREATE POLICY "read supervisor_assignments" ON supervisor_assignments FOR SELECT USING (true);
CREATE POLICY "manage supervisor_assignments" ON supervisor_assignments FOR ALL USING (true);

-- 8. View: pengajuan yang perlu di-approve di level tertentu
CREATE OR REPLACE VIEW pending_approvals AS
SELECT 
  lr.id as request_id,
  'leave' as request_type,
  lr.user_id,
  ua.name as requester_name,
  lr.leave_type,
  lr.start_date,
  lr.end_date,
  lr.reason,
  lr.status as request_status,
  lr.current_approval_level,
  lr.approval_status
FROM leave_requests lr
JOIN user_accounts ua ON ua.id = lr.user_id
WHERE lr.approval_status IN ('pending', 'pending_level_2', 'pending_level_3')

UNION ALL

SELECT 
  ot.id as request_id,
  'overtime' as request_type,
  ot.user_id,
  ua.name as requester_name,
  'Lembur' as leave_type,
  ot.overtime_date as start_date,
  ot.overtime_date as end_date,
  ot.reason,
  ot.status as request_status,
  ot.current_approval_level,
  ot.approval_status
FROM overtime_requests ot
JOIN user_accounts ua ON ua.id = ot.user_id
WHERE ot.approval_status IN ('pending', 'pending_level_2', 'pending_level_3');
