import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const supabase = getAdmin()
  const courseId = req.nextUrl.searchParams.get('courseId')
  const lessonId = req.nextUrl.searchParams.get('lessonId')

  // Load Tracy's user record
  const { data: userRec } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'tracybailey5150@icloud.com')
    .single()

  if (!userRec) {
    return NextResponse.json({ courses: [], progress: [] })
  }

  // If lessonId provided, return single lesson data
  if (lessonId && courseId) {
    const [{ data: lesson }, { data: courseData }, { data: resources }] = await Promise.all([
      supabase.from('lessons').select('*').eq('id', lessonId).single(),
      supabase.from('courses').select('voice_id').eq('id', courseId).single(),
      supabase.from('course_resources').select('*').eq('course_id', courseId).eq('lesson_id', lessonId),
    ])

    return NextResponse.json({
      lesson: lesson ?? null,
      voiceId: courseData?.voice_id ?? 'onyx',
      resources: resources ?? [],
      userId: userRec.id,
    })
  }

  // If courseId provided, return course detail data
  if (courseId) {
    const [{ data: course }, { data: units }, { data: lessons }, { data: progressData }] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('curriculum_units').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
      supabase.from('progress').select('lesson_id, status, score').eq('user_id', userRec.id).eq('course_id', courseId),
    ])

    return NextResponse.json({
      course: course ?? null,
      units: units ?? [],
      lessons: lessons ?? [],
      progress: progressData ?? [],
      userId: userRec.id,
    })
  }

  // Default: return all courses with lesson counts
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userRec.id)
    .order('created_at', { ascending: false })

  const enriched = await Promise.all((courses ?? []).map(async (c) => {
    const [{ count: lessonCount }, { count: completedCount }] = await Promise.all([
      supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id),
      supabase.from('progress').select('*', { count: 'exact', head: true }).eq('course_id', c.id).eq('user_id', userRec.id).eq('status', 'completed'),
    ])
    return { ...c, lesson_count: lessonCount ?? 0, completed_count: completedCount ?? 0 }
  }))

  const { data: progress } = await supabase
    .from('progress')
    .select('course_id, lesson_id, status, score')
    .eq('user_id', userRec.id)

  return NextResponse.json({
    courses: enriched,
    progress: progress ?? [],
    userId: userRec.id,
  })
}
