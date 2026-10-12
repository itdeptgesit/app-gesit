-- Employee preferred / nickname, optional and separate from legal full name.
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS nickname TEXT;

COMMENT ON COLUMN public.user_accounts.nickname IS 'Preferred name used in daily HR and attendance display.';

CREATE INDEX IF NOT EXISTS idx_user_accounts_nickname
  ON public.user_accounts (nickname)
  WHERE nickname IS NOT NULL;
