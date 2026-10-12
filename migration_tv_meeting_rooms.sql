-- Gesit TV Meeting Room management
-- Run once in Supabase SQL Editor. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tv_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code TEXT NOT NULL UNIQUE,
    room_name TEXT NOT NULL,
    location TEXT,
    calendar_id TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    hdmi_label TEXT NOT NULL DEFAULT 'HDMI 2',
    wallpaper_url TEXT,
    hero_messages JSONB NOT NULL DEFAULT '["Selamat datang di ruang meeting GESIT."]'::jsonb,
    menu_flags JSONB NOT NULL DEFAULT '{"corporate_tv":true,"presentation":true,"screen_cast":true,"schedule":true,"settings":true,"emergency":true}'::jsonb,
    emergency_contact TEXT,
    sync_interval_seconds INTEGER NOT NULL DEFAULT 60 CHECK (sync_interval_seconds BETWEEN 30 AND 3600),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    app_version TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

CREATE TABLE IF NOT EXISTS public.tv_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.tv_devices(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT 'Primary',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tv_device_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES public.tv_devices(id) ON DELETE SET NULL,
    device_code TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_by TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tv_devices_active ON public.tv_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_tv_devices_last_seen ON public.tv_devices(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_tv_tokens_device ON public.tv_device_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_tv_audit_device ON public.tv_device_audit_logs(device_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_tv_device_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tv_devices_updated_at ON public.tv_devices;
CREATE TRIGGER trg_tv_devices_updated_at
BEFORE UPDATE ON public.tv_devices
FOR EACH ROW EXECUTE FUNCTION public.set_tv_device_updated_at();

ALTER TABLE public.tv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_device_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_tv_config_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_accounts account
        WHERE LOWER(account.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
          AND (
              LOWER(COALESCE(account.role::text, '')) IN ('super admin', 'super_admin')
              OR COALESCE(account.groups::text, '') ~ '(it_staff|it_management)'
          )
    );
$$;

REVOKE ALL ON FUNCTION public.is_tv_config_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tv_config_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS tv_devices_authenticated_select ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_authenticated_insert ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_authenticated_update ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_authenticated_delete ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_it_select ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_it_insert ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_it_update ON public.tv_devices;
DROP POLICY IF EXISTS tv_devices_it_delete ON public.tv_devices;
CREATE POLICY tv_devices_it_select ON public.tv_devices FOR SELECT TO authenticated USING (public.is_tv_config_admin());
CREATE POLICY tv_devices_it_insert ON public.tv_devices FOR INSERT TO authenticated WITH CHECK (public.is_tv_config_admin());
CREATE POLICY tv_devices_it_update ON public.tv_devices FOR UPDATE TO authenticated USING (public.is_tv_config_admin()) WITH CHECK (public.is_tv_config_admin());
CREATE POLICY tv_devices_it_delete ON public.tv_devices FOR DELETE TO authenticated USING (public.is_tv_config_admin());

-- Device token hashes are server-only. Browser clients cannot read or write them.
DROP POLICY IF EXISTS tv_tokens_service_role_all ON public.tv_device_tokens;
CREATE POLICY tv_tokens_service_role_all ON public.tv_device_tokens FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS tv_audit_authenticated_select ON public.tv_device_audit_logs;
DROP POLICY IF EXISTS tv_audit_authenticated_insert ON public.tv_device_audit_logs;
DROP POLICY IF EXISTS tv_audit_it_select ON public.tv_device_audit_logs;
DROP POLICY IF EXISTS tv_audit_it_insert ON public.tv_device_audit_logs;
CREATE POLICY tv_audit_it_select ON public.tv_device_audit_logs FOR SELECT TO authenticated USING (public.is_tv_config_admin());
CREATE POLICY tv_audit_it_insert ON public.tv_device_audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_tv_config_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tv_devices TO authenticated;
GRANT SELECT, INSERT ON public.tv_device_audit_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tv_device_audit_logs_id_seq TO authenticated;
GRANT ALL ON public.tv_devices, public.tv_device_tokens, public.tv_device_audit_logs TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tv-wallpapers',
    'tv-wallpapers',
    TRUE,
    8388608,
    ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS tv_wallpapers_public_read ON storage.objects;
DROP POLICY IF EXISTS tv_wallpapers_authenticated_insert ON storage.objects;
DROP POLICY IF EXISTS tv_wallpapers_authenticated_update ON storage.objects;
DROP POLICY IF EXISTS tv_wallpapers_authenticated_delete ON storage.objects;
CREATE POLICY tv_wallpapers_public_read ON storage.objects FOR SELECT USING (bucket_id = 'tv-wallpapers');
CREATE POLICY tv_wallpapers_authenticated_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tv-wallpapers' AND public.is_tv_config_admin());
CREATE POLICY tv_wallpapers_authenticated_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tv-wallpapers' AND public.is_tv_config_admin()) WITH CHECK (bucket_id = 'tv-wallpapers' AND public.is_tv_config_admin());
CREATE POLICY tv_wallpapers_authenticated_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tv-wallpapers' AND public.is_tv_config_admin());

INSERT INTO public.tv_devices (
    device_code,
    room_name,
    location,
    hdmi_label,
    hero_messages,
    emergency_contact
)
VALUES (
    'MEETING-ROOM-01',
    'Ruang Meeting 1',
    'Kantor GESIT',
    'HDMI 2',
    '["Selamat datang di ruang meeting GESIT.","Rapat lebih nyaman, kolaborasi lebih cepat.","Hubungkan, tampilkan, dan mulai meeting."]'::jsonb,
    'Security / General Affairs'
)
ON CONFLICT (device_code) DO NOTHING;

COMMENT ON TABLE public.tv_devices IS 'Configuration and online status for Gesit meeting-room TV launchers.';
COMMENT ON TABLE public.tv_device_tokens IS 'Hashed device API credentials. Plain tokens must never be stored.';
COMMENT ON TABLE public.tv_device_audit_logs IS 'Configuration change history for TV devices.';
COMMENT ON COLUMN public.tv_devices.calendar_id IS 'Google Calendar resource/calendar ID read by the server-side connector.';
COMMENT ON COLUMN public.tv_devices.menu_flags IS 'Feature visibility flags consumed by the launcher API.';
COMMENT ON COLUMN public.tv_devices.hero_messages IS 'Rotating launcher headline strings.';

-- Expose the module to existing IT profiles without overwriting other menu permissions.
UPDATE public.user_groups
SET allowed_menus = CASE
    WHEN 'tv-meeting-rooms' = ANY(allowed_menus) THEN allowed_menus
    ELSE array_append(allowed_menus, 'tv-meeting-rooms')
END
WHERE id IN ('it_staff', 'it_management');
