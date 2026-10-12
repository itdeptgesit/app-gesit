-- Flexible launcher input sources per meeting-room device.
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS input_sources JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tv_devices.input_sources IS
'Ordered launcher input buttons. Each item: id, type (hdmi|airplay), port, label, enabled.';

UPDATE public.tv_devices
SET input_sources = '[
  {"id":"conference-laptop","type":"hdmi","port":"HDMI 2","label":"Laptop","enabled":true},
  {"id":"conference-airplay","type":"airplay","port":null,"label":"AirPlay","enabled":true}
]'::jsonb,
menu_flags = COALESCE(menu_flags, '{}'::jsonb) || '{
  "corporate_tv":false,
  "presentation":false,
  "screen_cast":false,
  "schedule":false,
  "settings":false,
  "emergency":false
}'::jsonb
WHERE device_code IN ('MEETING-CONFERENCE', 'MEETING-ROOM-01');

UPDATE public.tv_devices
SET input_sources = '[
  {"id":"board-poly","type":"hdmi","port":"HDMI 1","label":"Poly","enabled":true},
  {"id":"board-laptop","type":"hdmi","port":"HDMI 3","label":"Direct Laptop","enabled":true},
  {"id":"board-airplay","type":"airplay","port":null,"label":"AirPlay","enabled":true}
]'::jsonb,
menu_flags = COALESCE(menu_flags, '{}'::jsonb) || '{
  "corporate_tv":false,
  "presentation":false,
  "screen_cast":false,
  "schedule":false,
  "settings":false,
  "emergency":false
}'::jsonb
WHERE device_code IN ('BOARD-ROOM', 'BOARD-ROOM-01');
