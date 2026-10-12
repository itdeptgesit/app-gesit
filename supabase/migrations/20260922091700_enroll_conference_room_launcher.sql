-- Permanent Conference Room launcher credential (hash only).
DELETE FROM public.tv_device_tokens
WHERE device_id = (SELECT id FROM public.tv_devices WHERE device_code = 'MEETING-ROOM-01')
  AND label = 'Conference Room APK';
INSERT INTO public.tv_device_tokens (device_id, token_hash, label)
SELECT id, 'c1a8a4895088339165c26cf660d550ea248d19fb6540fae99579203315808077', 'Conference Room APK' FROM public.tv_devices WHERE device_code = 'MEETING-ROOM-01';
