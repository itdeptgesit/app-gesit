import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildScheduleStatus, extractDeviceToken, routeAction, type CalendarEvent } from './core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-device-id, x-device-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const base64Url = (input: Uint8Array | string) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const pemToArrayBuffer = (pem: string) => {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

interface GoogleCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let googleTokenCache: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 60_000) return googleTokenCache.token;
  const raw = Deno.env.get('GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('Google Calendar secret is not configured');
  const credentials = JSON.parse(raw) as GoogleCredentials;
  if (!credentials.client_email || !credentials.private_key) throw new Error('Google Calendar secret is invalid');

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(credentials.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch(credentials.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(`Google authentication failed: ${payload.error_description || payload.error || response.status}`);
  googleTokenCache = { token: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 };
  return googleTokenCache.token;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Supabase server credentials unavailable');

    // Public route: no auth required
    if (req.method === 'GET' && routeAction(req.url) === 'devices') {
      const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: devices } = await admin
        .from('tv_devices')
        .select('device_code, room_name')
        .eq('is_active', true)
        .order('room_name');
      return json({ devices: devices || [] });
    }

    const deviceCode = req.headers.get('x-device-id')?.trim().toUpperCase();
    const token = extractDeviceToken(req.headers);
    if (!deviceCode || !token) return json({ error: 'Missing device credentials' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const tokenHash = await sha256(token);
    const { data: credential, error: credentialError } = await admin
      .from('tv_device_tokens')
      .select('id, device_id, expires_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (credentialError) throw credentialError;
    if (!credential || credential.revoked_at || (credential.expires_at && new Date(credential.expires_at) <= new Date())) {
      return json({ error: 'Invalid device credentials' }, 401);
    }

    const { data: device, error: deviceError } = await admin
      .from('tv_devices')
      .select('*')
      .eq('id', credential.device_id)
      .eq('device_code', deviceCode)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (!device) return json({ error: 'Invalid device credentials' }, 401);
    if (!device.is_active) return json({ error: 'Device is disabled' }, 403);
    await admin.from('tv_device_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', credential.id);

    const action = routeAction(req.url);
    if (action === 'config' && req.method === 'GET') {
      return json({
        device_id: device.device_code,
        room_name: device.room_name,
        location: device.location,
        timezone: device.timezone,
        default_hdmi: device.hdmi_label,
        input_sources: device.input_sources,
        default_language: device.default_language,
        wallpaper_url: device.wallpaper_url,
        hero_messages: device.hero_messages,
        hero_messages_en: device.hero_messages_en,
        calendar_id: device.calendar_id,
        menu_flags: device.menu_flags,
        emergency_contact: device.emergency_contact,
        sync_interval_seconds: device.sync_interval_seconds,
        config_updated_at: device.updated_at,
      });
    }

    if (action === 'heartbeat' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      const update: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        app_version: typeof body.app_version === 'string' ? body.app_version.slice(0, 50) : null,
      };
      if (forwarded && /^[0-9a-f:.]+$/i.test(forwarded)) update.ip_address = forwarded;
      const { error } = await admin.from('tv_devices').update(update).eq('id', device.id);
      if (error) throw error;
      return json({ success: true, server_time: new Date().toISOString() });
    }

    if (action === 'schedule' && req.method === 'GET') {
      if (!device.calendar_id) return json({ error: 'Calendar ID is not configured' }, 409);
      const accessToken = await getGoogleAccessToken();
      const now = new Date();
      const timeMax = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '20',
        timeZone: device.timezone || 'Asia/Jakarta',
      });
      const googleResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(device.calendar_id)}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googlePayload = await googleResponse.json();
      if (!googleResponse.ok) {
        const message = googlePayload.error?.message || `Google Calendar error ${googleResponse.status}`;
        return json({ error: message }, googleResponse.status === 404 ? 404 : 502);
      }
      const schedule = buildScheduleStatus((googlePayload.items || []) as CalendarEvent[], now);
      return json({
        room: { device_id: device.device_code, name: device.room_name, timezone: device.timezone },
        ...schedule,
        synced_at: now.toISOString(),
      });
    }

    return json({ error: 'Route or method not found' }, 404);
  } catch (error) {
    console.error('tv-launcher-api error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected server error' }, 500);
  }
});
