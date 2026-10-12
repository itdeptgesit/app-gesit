-- Connect Gesit meeting-room devices to Google resource calendars.

UPDATE public.tv_devices
SET room_name = 'The Gesit Companies-27-Conference Room',
    calendar_id = 'gesit.co.id_1886ldn4o9gkoh6ojiheatbpaugoa@resource.calendar.google.com',
    timezone = 'Asia/Jakarta',
    updated_by = 'system-calendar-setup'
WHERE device_code = 'MEETING-ROOM-01';

INSERT INTO public.tv_devices (
    device_code,
    room_name,
    location,
    calendar_id,
    timezone,
    hdmi_label,
    hero_messages,
    emergency_contact
)
VALUES (
    'BOARD-ROOM-01',
    'The Gesit Companies-27-Board Room',
    'The Gesit Companies - Lantai 27',
    'gesit.co.id_1880kl9nuat8miluk0d0qstd0rd64@resource.calendar.google.com',
    'Asia/Jakarta',
    'HDMI 2',
    '["Selamat datang di Board Room GESIT.","Rapat lebih nyaman, kolaborasi lebih cepat.","Hubungkan, tampilkan, dan mulai meeting."]'::jsonb,
    'Security / General Affairs'
)
ON CONFLICT (device_code) DO UPDATE SET
    room_name = EXCLUDED.room_name,
    location = EXCLUDED.location,
    calendar_id = EXCLUDED.calendar_id,
    timezone = EXCLUDED.timezone,
    updated_by = 'system-calendar-setup';
