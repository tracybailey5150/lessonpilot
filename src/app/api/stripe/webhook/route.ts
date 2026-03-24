export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { notifyNewSubscription } from '@/lib/email'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function verifyStripeWebhook(payload: string, signature: string, secret: string) {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('='); acc[k] = v; return acc
  }, {})
  const { t, v1 } = parts
  if (!t || !v1) throw new Error('Malformed stripe-signature')
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex')
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'))) throw new Error('Signature mismatch')
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) throw new Error('Timestamp too old')
  return JSON.parse(payload)
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })

  const payload = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: any
  try {
    event = verifyStripeWebhook(payload, signature, webhookSecret)
  } catch (err) {
    console.error('[LP Webhook] Sig verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[LP Webhook]', event.type)
  const supabase = getSupabase()
  const obj = event.data.object

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = obj.subscription_data?.metadata?.userId || obj.metadata?.userId
        const customerEmail = obj.customer_email || obj.customer_details?.email || ''
        const amountTotal = obj.amount_total ? `$${(obj.amount_total / 100).toFixed(2)}/mo` : 'subscription'

        await supabase.from('users').update({
          subscription_status: 'active',
          stripe_customer_id: obj.customer,
          stripe_subscription_id: obj.subscription,
          updated_at: new Date().toISOString(),
        }).eq('id', userId)

        // Notify Tracy
        notifyNewSubscription('LessonPilot', customerEmail, 'Pro', amountTotal).catch(() => {})
        console.log('[LP] Activated subscription for user:', userId)
        break
      }
      case 'customer.subscription.updated': {
        await supabase.from('users').update({
          subscription_status: obj.status,
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', obj.id)
        break
      }
      case 'customer.subscription.deleted': {
        await supabase.from('users').update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', obj.id)
        break
      }
      case 'invoice.payment_failed': {
        await supabase.from('users').update({
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', obj.customer)
        break
      }
      case 'invoice.payment_succeeded': {
        await supabase.from('users').update({
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', obj.customer)
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[LP Webhook] Handler error:', err)
    return NextResponse.json({ received: true, error: 'logged' })
  }
}
