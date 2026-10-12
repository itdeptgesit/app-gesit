import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auth gate: require an unexpired JWT with role 'authenticated' (logged-in Supabase session).
// Signature verification is handled by Supabase Gateway (verify_jwt=true). Here we only reject
// anon/service-role tokens and stale sessions.
function getAuthUser(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null

  try {
    const base64Url = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Url))
    if (payload.role !== 'authenticated') return null
    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) return null
    return payload.sub || null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = getAuthUser(req)
    if (!userId) {
      throw new Error('Unauthorized: requires an authenticated user')
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured in Supabase Secrets')
    }

    const { messages, systemPrompt, model } = await req.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Missing parameters: messages')
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://it.gesit.co.id',
        'X-Title': 'Gesit ERP',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'deepseek/deepseek-v4-flash:free',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages,
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data?.error?.message || `OpenRouter API failed (${res.status})`)
    }

    let content = data.choices?.[0]?.message?.content
    if (!content && data.choices?.[0]?.message?.reasoning) {
      content = data.choices[0].message.reasoning
    }
    if (!content) {
      throw new Error('Empty response from AI')
    }

    return new Response(
      JSON.stringify({ success: true, content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('AI chat error:', error)
    const isUnauthorized = String(error?.message || '').startsWith('Unauthorized')
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: isUnauthorized ? 401 : 500 }
    )
  }
})