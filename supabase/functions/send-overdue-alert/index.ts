// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, borrowerName, assetName, dueDate } = await req.json()

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GESIT ERP IT Support <it-support@gesit.co.id>',
        to: [to],
        subject: `[OVERDUE REMINDER] Asset Loan: ${assetName}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #e11d48;">Asset Return Overdue</h2>
            <p>Dear <strong>${borrowerName}</strong>,</p>
            <p>This is an automated reminder that your IT asset loan has reached its return date.</p>
            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0;"><strong>Asset:</strong> ${assetName}</p>
              <p style="margin: 0;"><strong>Due Date:</strong> ${dueDate}</p>
            </div>
            <p>Please return the equipment to the IT Department as soon as possible to avoid any further action.</p>
            <p>If you have already returned it or need an extension, please contact IT personnel.</p>
            <br />
            <p>Best Regards,</p>
            <p><strong>GESIT IT Support Team</strong></p>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
