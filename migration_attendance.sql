-- STEP 1: Drop everything first (run this alone)
DROP TRIGGER IF EXISTS trg1 ON attendance_schedules;
DROP TRIGGER IF EXISTS trg2 ON attendance_records;
DROP TRIGGER IF EXISTS trg3 ON leave_requests;
DROP TRIGGER IF EXISTS trg4 ON overtime_requests;
DROP TRIGGER IF EXISTS trg5 ON attendance_settings;
DROP TRIGGER IF EXISTS trg_attendance_schedules_updated_at ON attendance_schedules;
DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON attendance_records;
DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
DROP TRIGGER IF EXISTS trg_overtime_requests_updated_at ON overtime_requests;
DROP TRIGGER IF EXISTS trg_attendance_settings_updated_at ON attendance_settings;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP TABLE IF EXISTS attendance_settings CASCADE;
DROP TABLE IF EXISTS overtime_requests CASCADE;
DROP TABLE IF EXISTS reimbursements CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS office_locations CASCADE;
DROP TABLE IF EXISTS employee_schedules CASCADE;
DROP TABLE IF EXISTS attendance_schedules CASCADE;

-- STEP 2: Create tables (run this second)
CREATE TABLE attendance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    break_duration_minutes INT NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    schedule_id UUID NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE office_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    clock_in_lat NUMERIC,
    clock_in_lng NUMERIC,
    clock_out_lat NUMERIC,
    clock_out_lng NUMERIC,
    clock_in_location_id UUID,
    clock_out_location_id UUID,
    status TEXT NOT NULL DEFAULT 'present',
    total_work_minutes INT,
    total_overtime_minutes INT DEFAULT 0,
    notes TEXT,
    work_mode TEXT DEFAULT 'wfo',
    photo_url TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    leave_type TEXT NOT NULL DEFAULT 'annual',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    reason TEXT NOT NULL,
    project_or_task TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reimbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'transport',
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_schedule_id UUID,
    work_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
    auto_approve_overtime BOOLEAN NOT NULL DEFAULT FALSE,
    max_clock_in_distance_meters INT NOT NULL DEFAULT 500,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 3: Indexes + RLS + Data + Triggers (run this third)
CREATE INDEX idx_employee_schedules_user_id ON employee_schedules(user_id);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX idx_overtime_requests_user_status ON overtime_requests(user_id, status);
CREATE INDEX idx_reimbursements_user_status ON reimbursements(user_id, status);

ALTER TABLE attendance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p1" ON attendance_schedules FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p2" ON employee_schedules FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p3" ON office_locations FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p4" ON attendance_records FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p5" ON leave_requests FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p6" ON overtime_requests FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p8" ON reimbursements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p7" ON attendance_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

INSERT INTO attendance_schedules (name, start_time, end_time, grace_period_minutes, break_duration_minutes)
VALUES ('Standard', '08:00:00', '17:00:00', 15, 60);

INSERT INTO attendance_settings (default_schedule_id, work_days, auto_approve_overtime, max_clock_in_distance_meters)
SELECT id, '{1,2,3,4,5}', FALSE, 500 FROM attendance_schedules WHERE name = 'Standard';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg1 BEFORE UPDATE ON attendance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg2 BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg3 BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg4 BEFORE UPDATE ON overtime_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reimbursements_updated_at BEFORE UPDATE ON reimbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg5 BEFORE UPDATE ON attendance_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
