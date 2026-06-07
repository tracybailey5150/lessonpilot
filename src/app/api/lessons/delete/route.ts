import { createServiceClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const { lessonId, userId } = await req.json()

  if (!lessonId || !userId) {
    return Response.json({ error: 'Missing lessonId or userId' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify user owns the course that contains this lesson
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .single()

  if (!lesson) {
    return Response.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const { data: userRec } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_auth_id', userId)
    .single()

  if (!userRec) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', lesson.course_id)
    .eq('user_id', userRec.id)
    .single()

  if (!course) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Delete progress records for this lesson
  await supabase.from('progress').delete().eq('lesson_id', lessonId)

  // Delete the lesson
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ status: 'deleted', lessonId })
}
