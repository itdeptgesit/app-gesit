-- Update koordinat kantor sesuai lokasi aktual (The City Tower, Jl. MH Thamrin)
-- Jalankan di Supabase SQL Editor

-- 1. Update HQ (kantor utama)
UPDATE office_locations
SET 
  latitude = -6.1942,
  longitude = 106.8226,
  radius_meters = 150,
  address = 'The City Tower, Jl. M.H. Thamrin No.81, Jakarta Pusat'
WHERE name = 'HQ / Kantor Pusat';

-- 2. Jika tidak ada baris HQ, insert baru
INSERT INTO office_locations (name, address, latitude, longitude, radius_meters, is_active)
SELECT 'HQ / Kantor Pusat', 'The City Tower, Jl. M.H. Thamrin No.81, Jakarta Pusat', -6.1942, 106.8226, 150, true
WHERE NOT EXISTS (SELECT 1 FROM office_locations WHERE name = 'HQ / Kantor Pusat');

-- 3. Tampilkan hasil
SELECT id, name, address, latitude, longitude, radius_meters, is_active FROM office_locations;
