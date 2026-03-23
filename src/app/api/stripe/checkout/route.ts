import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
    apiVersion: '2026-02-25.clover' as any,
  })
}

const PLANS = {
  pro: { amount: 1900, name: 'LessonPilot Pro', interval: 'month' as const },
  team: { amount: 4900, name: 'LessonPilot Team', interval: 'month' as const },
}

async function getOrCreatePrice(planKey: keyof typeof PLANS): Promise<string> {
  const plan = PLANS[planKey]
  // Search for existing price
  const prices = await getStripe().prices.list({ active: true, limit: 100 })
  const existing = prices.data.find(
    p => p.unit_amount === plan.amount && p.currency === 'usd' && p.recurring?.interval === 'month'
      && typeof p.product === 'string'
  )
  if (existing) return existing.id

  // Create product + price
  const product = await getStripe().products.create({ name: plan.name })
  const price = await getStripe().prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: plan.interval },
  })
  return price.id
}

export async function POST(req: NextRequest) {
  try {
    const { planKey, userId, userEmail } = await req.json()

    const priceId = await getOrCreatePrice(planKey as keyof typeof PLANS)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lessonpilot-tracy-baileys-projects.vercel.app'

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
      },
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe checkout error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
