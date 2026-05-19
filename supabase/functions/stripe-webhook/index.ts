import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.client_reference_id
        if (orgId) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              subscription_tier: 'pro',
              subscription_status: 'active'
            })
            .eq('id', orgId)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: orgs } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
        
        if (orgs && orgs.length > 0) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              subscription_tier: 'free',
              subscription_status: 'canceled'
            })
            .eq('id', orgs[0].id)
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const status = subscription.status === 'active' ? 'active' : 'past_due'
        const tier = subscription.status === 'active' ? 'pro' : 'free'

        const { data: orgs } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
        
        if (orgs && orgs.length > 0) {
          await supabaseAdmin
            .from('organizations')
            .update({ 
              subscription_tier: tier,
              subscription_status: status
            })
            .eq('id', orgs[0].id)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
