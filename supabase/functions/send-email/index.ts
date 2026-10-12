import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, from, text } = await req.json()

    if (!to || !subject || !body) {
      throw new Error('Missing parameters: to, subject, or body')
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured in Supabase Secrets')
    }

    const recipients = Array.isArray(to) ? to : [to]

    const payload: any = {
      from: from || 'GESIT PORTAL <no-reply@send.gesit.co.id>',
      to: recipients,
      subject: subject,
    }

    if (text) {
      payload.text = text
    } else {
      payload.html = body // body from frontend is currently a simple string, but we can treat it as html
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorData = await res.text()
      throw new Error(`Resend API failed: ${errorData}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error('Email send error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})