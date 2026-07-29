export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-02-25.clover' as any,
  })
}

// GET: check which catalog courses user is enrolled in
export async function GET(req: NextRequest) {
  const authId = req.nextUrl.searchParams.get('authId')
  if (!authId) return NextResponse.json({ error: 'Missing authId' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, role, subscription_status')
    .eq('supabase_auth_id', authId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('user_id', user.id)

  return NextResponse.json({
    role: user.role,
    subscription_status: user.subscription_status,
    enrolledCourseIds: (enrollments ?? []).map((e: { course_id: string }) => e.course_id),
  })
}

// POST: enroll in a catalog course (checks permissions)
export async function POST(req: NextRequest) {
  const { authId, courseId } = await req.json()
  if (!authId || !courseId) return NextResponse.json({ error: 'Missing authId or courseId' }, { status: 400 })

  const supabase = createServiceClient()

  // Get user
  const { data: user } = await supabase
    .from('users')
    .select('id, role, subscription_status, email, stripe_customer_id')
    .eq('supabase_auth_id', authId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get course
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, tier, price, is_published')
    .eq('id', courseId)
    .single()

  if (!course || !course.is_published) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  // Check if already enrolled
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (existing) return NextResponse.json({ status: 'already_enrolled' })

  // Permission check
  const isOwner = user.role === 'owner'
  const isPaid = ['active', 'trialing'].includes(user.subscription_status)

  // Owners and paid subscribers get instant access to all courses
  if (isOwner || isPaid) {
    const { error } = await supabase
      .from('enrollments')
      .insert({ user_id: user.id, course_id: courseId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ status: 'enrolled' })
  }

  // Free tier courses: instant access
  if (course.tier === 'free') {
    const { error } = await supabase
      .from('enrollments')
      .insert({ user_id: user.id, course_id: courseId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ status: 'enrolled' })
  }

  // Premium/Pro courses for free users: redirect to Stripe checkout for Pro plan
  // Or single-course purchase if the course has a price
  if (course.price && Number(course.price) > 0) {
    // Single course purchase via Stripe
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lessonpilot.org'
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: course.title },
          unit_amount: Number(course.price) * 100,
        },
        quantity: 1,
      }],
      metadata: { userId: user.id, courseId: course.id, type: 'course_purchase' },
      success_url: `${appUrl}/catalog?enrolled=${course.id}`,
      cancel_url: `${appUrl}/catalog`,
    })

    return NextResponse.json({ status: 'checkout', url: session.url })
  }

  // Fallback: need Pro plan
  return NextResponse.json({ status: 'upgrade_required' })
}
