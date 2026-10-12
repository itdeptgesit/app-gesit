-- Hapus policy lama yang mungkin memblokir akses
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;

-- Nonaktifkan RLS sementara agar tidak memblokir query dari aplikasi
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;

-- Jika butuh buat ulang tabelnya jika sebelumnya belum ada:
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    device TEXT,
    browser TEXT,
    ip TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    session_token TEXT UNIQUE
);
