export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, subject, level, course_format, duration_days, is_featured, price, tier, category, description, preview_image')
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get lesson counts for published courses
  const courseIds = (courses ?? []).map((c: { id: string }) => c.id)
  const { data: lessons } = await supabase
    .from('lessons')
    .select('course_id')
    .in('course_id', courseIds)

  const counts: Record<string, number> = {}
  ;(lessons ?? []).forEach((l: { course_id: string }) => {
    counts[l.course_id] = (counts[l.course_id] || 0) + 1
  })

  // Get module/unit counts
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('course_id')
    .in('course_id', courseIds)

  const moduleCounts: Record<string, number> = {}
  ;(units ?? []).forEach((u: { course_id: string }) => {
    moduleCounts[u.course_id] = (moduleCounts[u.course_id] || 0) + 1
  })

  const enriched = (courses ?? []).map((c: Record<string, unknown>) => ({
    ...c,
    lessonCount: counts[c.id as string] || 0,
    moduleCount: moduleCounts[c.id as string] || 0,
  }))

  return NextResponse.json(enriched)
}
