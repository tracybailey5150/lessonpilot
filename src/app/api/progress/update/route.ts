import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId, lessonId, courseId, status, score } = await req.json()
    const supabase = createServiceClient()

    // Resolve internal user ID from supabase_auth_id
    let internalUserId = userId
    const { data: userRec } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_auth_id', userId)
      .single()
    if (userRec) {
      internalUserId = userRec.id
    }

    const { data, error } = await supabase
      .from('progress')
      .upsert({
        user_id: internalUserId,
        course_id: courseId,
        lesson_id: lessonId,
        status,
        ...(score != null ? { score } : {}),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ progress: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
