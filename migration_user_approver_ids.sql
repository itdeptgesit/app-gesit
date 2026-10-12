-- Diagnosa: cek tipe kolom saat ini
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'user_accounts'
--   AND column_name IN ('supervisor_id','manager_id','vp_id');

-- Drop SEMUA foreign key dari user_accounts yang menyentuh kolom approver,
-- apa pun namanya.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname, conrelid::regclass AS tbl
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = 'public.user_accounts'::regclass
  LOOP
    IF con.conname IN ('user_accounts_supervisor_id_fkey',
                       'user_accounts_manager_id_fkey',
                       'user_accounts_vp_id_fkey',
                       'fk_user_accounts_supervisor_id',
                       'fk_user_accounts_manager_id',
                       'fk_user_accounts_vp_id')
    THEN
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', con.tbl, con.conname);
    END IF;
  END LOOP;
END $$;

-- Ubah kolom approver menjadi TEXT (menyimpan UUID user)
ALTER TABLE public.user_accounts ALTER COLUMN supervisor_id TYPE text USING supervisor_id::text;
ALTER TABLE public.user_accounts ALTER COLUMN manager_id TYPE text USING manager_id::text;
ALTER TABLE public.user_accounts ALTER COLUMN vp_id TYPE text USING vp_id::text;

-- Muat ulang skema PostgREST
NOTIFY pgrst, 'reload schema';