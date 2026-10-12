-- Employee lifecycle: active, leave, resigned, terminated.
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS status_effective_date DATE,
  ADD COLUMN IF NOT EXISTS separation_date DATE,
  ADD COLUMN IF NOT EXISTS separation_reason TEXT;

ALTER TABLE public.user_accounts
  DROP CONSTRAINT IF EXISTS user_accounts_employment_status_check;
ALTER TABLE public.user_accounts
  ADD CONSTRAINT user_accounts_employment_status_check
  CHECK (employment_status IN ('Active', 'On Leave', 'Resigned', 'Terminated'));

CREATE INDEX IF NOT EXISTS idx_user_accounts_employee_lifecycle
  ON public.user_accounts (employment_status, separation_date);

COMMENT ON COLUMN public.user_accounts.employment_status IS 'Employee lifecycle status; separate from account status.';
COMMENT ON COLUMN public.user_accounts.status_effective_date IS 'Effective date of current lifecycle status.';
COMMENT ON COLUMN public.user_accounts.separation_date IS 'Last working date for resigned or terminated employees.';
COMMENT ON COLUMN public.user_accounts.separation_reason IS 'Reason for leave, resignation, or termination.';
