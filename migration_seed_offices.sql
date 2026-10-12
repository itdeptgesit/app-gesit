-- Seeder/Migration: Office Locations (HQ, Trinity Tower, Rheem)
INSERT INTO public.office_locations (name, address, latitude, longitude, radius_meters, is_active)
VALUES 
  ('HQ / Kantor Pusat', 'Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan', -6.2250, 106.8123, 100, true),
  ('Trinity Tower', 'Jl. H. R. Rasuna Said No.Kav. C22, Kuningan, Jakarta Selatan', -6.2215, 106.8318, 100, true),
  ('Rheem Office', 'Jl. TB Simatupang No.18, Cilandak, Jakarta Selatan', -6.2912, 106.8134, 100, true)
ON CONFLICT DO NOTHING;
