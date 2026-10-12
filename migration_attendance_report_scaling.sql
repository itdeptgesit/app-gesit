-- Attendance report production scaling.
-- Safe/idempotent: does not alter attendance data.

CREATE INDEX IF NOT EXISTS idx_attendance_records_report_date_user
  ON public.attendance_records (date DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_report_status_date
  ON public.attendance_records (status, date DESC);

ANALYZE public.attendance_records;
