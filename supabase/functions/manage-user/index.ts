import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

let admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum di-set. Jalankan: supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"'
    );
  }
  admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return admin;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabase = getAdmin();
    const authorization = req.headers.get('authorization')?.trim();
    if (!authorization?.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Authentication required' }, 401);
    }

    const jwt = authorization.slice(7).trim();
    const { data: callerData, error: callerError } = await supabase.auth.getUser(jwt);
    const caller = callerData.user;
    if (callerError || !caller?.id || !caller.email) {
      return json({ error: 'Invalid session' }, 401);
    }

    // Authorization is resolved server-side. Client-provided role/group values are ignored.
    const { data: callerProfile, error: profileError } = await supabase
      .from('user_accounts')
      .select('role, groups, email')
      .or(`auth_id.eq.${caller.id},email.eq.${caller.email.toLowerCase()}`)
      .maybeSingle();
    if (profileError) {
      console.error('caller profile lookup failed:', profileError.message);
      return json({ error: 'Authorization check failed' }, 500);
    }

    const role = String(callerProfile?.role || '').trim().toLowerCase();
    const groups = Array.isArray(callerProfile?.groups)
      ? callerProfile.groups.map((value: unknown) => String(value).trim().toLowerCase())
      : [];
    const allowed = ['admin', 'super admin', 'super_admin'].includes(role)
      || groups.includes('it_management');
    if (!allowed) return json({ error: 'Admin access required' }, 403);

    const { email, password, fullName, existingId } = await req.json();
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const emailLower = String(email || '').trim().toLowerCase();
    const allowedDomains = new Set(['gesit.co.id', 'gnr.co.id']);
    const emailDomain = emailLower.split('@')[1];
    if (!emailLower || !emailDomain || !allowedDomains.has(emailDomain)) {
      return json({ error: 'A valid company email is required' }, 400);
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < 8 || password.length > 128)) {
      return json({ error: 'Password must contain 8-128 characters' }, 400);
    }
    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length > 150)) {
      return json({ error: 'Invalid full name' }, 400);
    }

    let authUserId: string | null = null;

    // 1. Search auth users with pagination (max 10 pages × 50 = 500 users)
    let page = 1;
    const perPage = 50;
    const maxPages = 10;

    while (page <= maxPages) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listErr) {
        console.error(`listUsers page ${page} error:`, listErr.message);
        break;
      }

      if (!list || !list.users || list.users.length === 0) break;

      const byEmail = list.users.find(
        (u: User) => (u.email || '').toLowerCase() === emailLower
      );
      if (byEmail) {
        authUserId = byEmail.id;
        break;
      }

      if (list.users.length < perPage) break; // last page
      page++;
    }

    // 2. Fallback to existingId (only if valid UUID)
    if (!authUserId && existingId && typeof existingId === 'string' && UUID_RE.test(existingId)) {
      authUserId = existingId;
    }

    // 3. Update existing user
    if (authUserId) {
      const updatePayload: Record<string, unknown> = {
        email_confirm: true,
      };
      if (password) updatePayload.password = password;
      if (fullName) updatePayload.user_metadata = { full_name: fullName };

      const { data, error } = await supabase.auth.admin.updateUserById(authUserId, updatePayload);
      if (error) return json({ error: error.message }, 400);
      return json({ id: data.user.id });
    }

    // 4. Create new user
    if (!email || !password) {
      return json({ error: 'email and password are required for new user creation' }, 400);
    }
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) return json({ error: createErr.message }, 400);
    return json({ id: created.user.id });
  } catch (e: any) {
    console.error('manage-user unhandled:', e);
    return json({ error: e.message || 'Unexpected error' }, 500);
  }
});
