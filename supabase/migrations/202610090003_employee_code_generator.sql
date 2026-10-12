-- Collision-safe employee code generator. Format: YYMM + 3-digit sequence.
CREATE OR REPLACE FUNCTION public.next_employee_code(p_join_date DATE)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $func$
DECLARE
  prefix TEXT := to_char(COALESCE(p_join_date, CURRENT_DATE), 'YYMM');
  next_number INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('employee-code:' || prefix));
  SELECT COALESCE(MAX(NULLIF(substring(employee_code FROM 5), '')::INTEGER), 0) + 1
    INTO next_number
  FROM public.user_accounts
  WHERE employee_code ~ ('^' || prefix || '[0-9]{3}$');
  IF next_number > 999 THEN
    RAISE EXCEPTION 'Employee code sequence exhausted for %', prefix;
  END IF;
  RETURN prefix || lpad(next_number::TEXT, 3, '0');
END;
$func$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_accounts_employee_code
  ON public.user_accounts(employee_code)
  WHERE employee_code IS NOT NULL AND employee_code <> '';

GRANT EXECUTE ON FUNCTION public.next_employee_code(DATE) TO authenticated;
