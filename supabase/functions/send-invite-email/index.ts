import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, orgName, invitedBy, inviteLink } = await req.json()
    console.log(`Sending email to ${email} for ${orgName}...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'AgriPro <invites@taryaak.com>',
        to: [email],
        subject: `You've been invited to join ${orgName} on AgriPro`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #16a34a;">Join the Team!</h2>
            <p>Hello,</p>
            <p><strong>${invitedBy}</strong> has invited you to manage <strong>${orgName}</strong> on AgriPro.</p>
            <p>AgriPro helps farmers track finances, manage labor, and monitor livestock all in one place.</p>
            <div style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
            </div>
            <p style="font-size: 12px; color: #6b7280;">If you don't have an account yet, simply sign up with this email address and you'll be automatically added to the team.</p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    console.log('Resend response:', data);

    if (!res.ok) {
      throw new Error(data.message || 'Resend API error');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
