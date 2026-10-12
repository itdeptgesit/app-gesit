-- Attach Meeting Room 3 token to device code used by web admin.
INSERT INTO public.tv_device_tokens (device_id, token_hash, expires_at)
SELECT id, '9f0f8f4d29d6701ae4ef15a7d74665a71bb437e51197e76b977ff39d28f5662a', NULL
FROM public.tv_devices
WHERE device_code = 'MEETING-ROOM-3'
ON CONFLICT (token_hash) DO UPDATE
SET device_id = EXCLUDED.device_id,
    revoked_at = NULL,
    expires_at = NULL;
