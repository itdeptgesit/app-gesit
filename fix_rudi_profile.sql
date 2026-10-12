-- Update data Rudi pakai kolom yang sudah ada
UPDATE user_accounts 
SET job_title = 'Teknisi IT', department = 'HR & Logistics'
WHERE email = 'rudi.siarudin@gesit.co.id';

-- Cek hasil
SELECT id, full_name, email, job_title, department, role 
FROM user_accounts 
WHERE email = 'rudi.siarudin@gesit.co.id';
