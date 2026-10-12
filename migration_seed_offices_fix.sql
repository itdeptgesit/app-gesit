-- ═══════════════════════════════════════════════════════════════
-- SEED OFFICE LOCATIONS + RLS POLICIES (jalan di SQL Editor)
-- Jalankan ini di: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════

-- 1) Isi tabel kalau kosong
INSERT INTO public.office_locations (name, address, latitude, longitude, radius_meters, is_active)
VALUES 
  ('HQ / Kantor Pusat', 'Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan', -6.2250, 106.8123, 100, true),
  ('Trinity Tower', 'Jl. H. R. Rasuna Said No.Kav. C22, Kuningan, Jakarta Selatan', -6.2215, 106.8318, 100, true),
  ('Rheem Office', 'Jl. TB Simatupang No.18, Cilandak, Jakarta Selatan', -6.2912, 106.8134, 100, true)
ON CONFLICT (name) DO UPDATE SET
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active;

-- 2) Pastikan RLS aktif & policy SELECT untuk anon ada
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'office_locations' AND policyname = 'office_locations_select'
  ) THEN
    CREATE POLICY "office_locations_select" ON public.office_locations
      FOR SELECT USING (true);
  END IF;
END $$;

-- 3) Verifikasi
SELECT id, name, latitude, longitude, radius_meters, is_active
FROM public.office_locations
ORDER BY name;