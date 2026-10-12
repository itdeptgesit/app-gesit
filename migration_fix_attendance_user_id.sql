-- Pastikan attendance_records tersinkron dengan user_accounts.id
-- Jika user_id di attendance_records berupa UUID auth.users.id, kita sesuaikan agar join dengan user_accounts.id (integer)

-- 1. Cek apakah ada record yang user_id nya UUID
-- 2. Update user_id attendance_records ke integer user_accounts.id berdasarkan email auth.users
UPDATE attendance_records ar
SET user_id = ua.id::text
FROM auth.users au
JOIN user_accounts ua ON ua.email = au.email
WHERE ar.user_id = au.id::text AND ar.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}';

-- Lakukan hal yang sama untuk leave_requests, overtime_requests, reimbursements
UPDATE leave_requests lr
SET user_id = ua.id::text
FROM auth.users au
JOIN user_accounts ua ON ua.email = au.email
WHERE lr.user_id = au.id::text AND lr.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}';

UPDATE overtime_requests orr
SET user_id = ua.id::text
FROM auth.users au
JOIN user_accounts ua ON ua.email = au.email
WHERE orr.user_id = au.id::text AND orr.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}';
