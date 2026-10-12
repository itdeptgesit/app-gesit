import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials missing in environment variables');
}

// Client standar (pakai anon key, tunduk ke RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Backward-compatible alias for components. Browser code always obeys RLS;
// administrative Auth operations run only in the manage-user Edge Function.
export const supabaseAdmin = supabase;

/**
 * Ensures a user account exists in Supabase Auth with the specified password.
 * Handles both new user creation and updating password for existing auth users.
 */
export const ensureAuthUserWithPassword = async (
  email: string,
  password?: string,
  fullName?: string,
  existingId?: string | number
): Promise<string | null> => {
  if (!password || !password.trim()) return null;
  const emailTrim = email.trim().toLowerCase();
  const passwordTrim = password.trim();
  const nameTrim = (fullName || emailTrim.split('@')[0]).trim();

  try {
    // 0. Prefer Supabase Edge Function (manage-user) — satu-satunya jalur
    //    yang memegang service role key secara aman (server-side).
    const invokeManageUser = async () => supabase.functions.invoke('manage-user', {
      body: {
        email: emailTrim,
        password: passwordTrim,
        fullName: nameTrim,
        existingId: existingId?.toString()
      }
    });

    let invokeResult = await invokeManageUser();
    // Retry sekali untuk menghindari transient cold-start 500
    if (invokeResult.error || !invokeResult.data?.id) {
      await new Promise(r => setTimeout(r, 800));
      invokeResult = await invokeManageUser();
    }

    const { data: fnData, error: fnErr } = invokeResult;
    if (!fnErr && fnData?.id) {
      return fnData.id;
    }
    if (fnErr) console.warn('manage-user invoke error:', fnErr.message);

    // Fail closed. User provisioning must never fall back to Auth Admin or
    // public signUp from browser code.
    if (fnErr || !fnData?.id) {
      console.error('Secure manage-user provisioning failed:', fnErr?.message || 'No user id returned');
    }
  } catch (adminEx) {
    console.warn('ensureAuthUserWithPassword secure provisioning exception:', adminEx);
  }

  return null;
};
