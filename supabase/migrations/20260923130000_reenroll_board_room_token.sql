-- Re-enroll BOARD-ROOM with new token
-- Token plaintext: gstv_WqUNXj8tLCuKd0xlvudmRI7i3zvHY4LQvrCEn3ToIhiCbkgMp39de4ym6de8gFqg
-- SHA-256: 05be92b5ac69d227db9995e415e526939cedf4f33c54d2334d843bc15a89d100

-- Remove old tokens for BOARD-ROOM
DELETE FROM public.tv_device_tokens
WHERE device_id = (SELECT id FROM public.tv_devices WHERE device_code = 'BOARD-ROOM');

-- Insert new token
INSERT INTO public.tv_device_tokens (device_id, token_hash, label, expires_at, revoked_at)
SELECT id, '05be92b5ac69d227db9995e415e526939cedf4f33c54d2334d843bc15a89d100', 'Board Room APK v2', NULL, NULL
FROM public.tv_devices WHERE device_code = 'BOARD-ROOM';
