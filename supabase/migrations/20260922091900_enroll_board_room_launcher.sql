-- Enroll Board Room launcher; database stores hash only.
DELETE FROM public.tv_device_tokens
WHERE device_id = (SELECT id FROM public.tv_devices WHERE device_code = 'BOARD-ROOM')
  AND label = 'Board Room APK';
INSERT INTO public.tv_device_tokens (device_id, token_hash, label, expires_at, revoked_at)
SELECT id, '476e368c3a2cbc7549e0831cfa688dc0acae70d2b5abe2ae5a3e48929e385e73', 'Board Room APK', NULL, NULL
FROM public.tv_devices WHERE device_code = 'BOARD-ROOM';
