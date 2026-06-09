import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = getAdmin()

  // Load Tracy's courses via the users table
  const { data: userRec } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'tracybailey5150@icloud.com')
    .single()

  if (!userRec) {
    return NextResponse.json({ courses: [], progress: [] })
  }

  const [{ data: courses }, { data: progress }] = await Promise.all([
    supabase.from('courses').select('*').eq('user_id', userRec.id).order('created_at', { ascending: false }),
    supabase.from('progress').select('course_id, lesson_id, status, score').eq('user_id', userRec.id),
  ])

  return NextResponse.json({
    courses: courses ?? [],
    progress: progress ?? [],
    userId: userRec.id,
  })
}
