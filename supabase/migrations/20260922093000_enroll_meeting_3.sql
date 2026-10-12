-- Enroll Meeting Room 3 launcher device.
INSERT INTO public.tv_devices (device_code, room_name, location, timezone, is_active)
VALUES ('MEETING-3', 'Meeting Room 3', 'GESIT Office', 'Asia/Jakarta', true)
ON CONFLICT (device_code) DO UPDATE SET room_name = EXCLUDED.room_name;

-- Insert token hash
INSERT INTO public.tv_device_tokens (device_id, token_hash, expires_at)
SELECT id, '9f0f8f4d29d6701ae4ef15a7d74665a71bb437e51197e76b977ff39d28f5662a', NULL
FROM public.tv_devices WHERE device_code = 'MEETING-3'
ON CONFLICT (token_hash) DO NOTHING;
