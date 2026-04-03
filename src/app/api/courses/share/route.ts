import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

// POST — create or get share link for a course
export async function POST(req: NextRequest) {
  try {
    const { courseId, userId } = await req.json()
    if (!courseId || !userId) return NextResponse.json({ error: 'courseId and userId required' }, { status: 400 })

    const supabase = createServiceClient()

    // Verify ownership
    const { data: course } = await supabase.from('courses').select('id, user_id, title').eq('id', courseId).single()
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // Get internal user ID
    const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', userId).single()
    if (!userRec || course.user_id !== userRec.id) {
      return NextResponse.json({ error: 'Not authorized — only the course owner can share' }, { status: 403 })
    }

    // Check if share link already exists
    const { data: existing } = await supabase
      .from('shared_courses')
      .select('share_code')
      .eq('course_id', courseId)
      .eq('owner_id', userRec.id)
      .is('shared_with_id', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ shareCode: existing.share_code, courseTitle: course.title })
    }

    // Create new share code
    const shareCode = randomBytes(6).toString('hex')
    await supabase.from('shared_courses').insert({
      course_id: courseId,
      owner_id: userRec.id,
      share_code: shareCode,
    })

    return NextResponse.json({ shareCode, courseTitle: course.title })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET — claim a shared course (add it to the user's library)
export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const userId = req.nextUrl.searchParams.get('userId')
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

    const supabase = createServiceClient()

    // Find the share record
    const { data: share } = await supabase
      .from('shared_courses')
      .select('*, courses(id, title, subject, level, goal, teaching_style, course_format, duration_days, sections_per_day, voice_id)')
      .eq('share_code', code)
      .maybeSingle()

    if (!share) return NextResponse.json({ error: 'Invalid share link' }, { status: 404 })

    const course = share.courses as any
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // If no userId, just return course info (for preview)
    if (!userId) {
      return NextResponse.json({ courseTitle: course.title, subject: course.subject, level: course.level, courseFormat: course.course_format })
    }

    // Get internal user ID
    const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', userId).single()
    if (!userRec) return NextResponse.json({ error: 'User not found — create an account first' }, { status: 400 })

    // Check if already claimed
    const { data: alreadyClaimed } = await supabase
      .from('shared_courses')
      .select('id')
      .eq('course_id', share.course_id)
      .eq('shared_with_id', userRec.id)
      .maybeSingle()

    if (alreadyClaimed) {
      return NextResponse.json({ status: 'already_claimed', courseId: share.course_id })
    }

    // Clone the course for this user
    const { data: newCourse, error: courseErr } = await supabase
      .from('courses')
      .insert({
        user_id: userRec.id,
        title: course.title,
        subject: course.subject,
        level: course.level,
        goal: course.goal,
        teaching_style: course.teaching_style,
        course_format: course.course_format,
        duration_days: course.duration_days,
        sections_per_day: course.sections_per_day,
        voice_id: course.voice_id,
      })
      .select()
      .single()

    if (courseErr || !newCourse) return NextResponse.json({ error: 'Failed to create course copy' }, { status: 500 })

    // Clone units
    const { data: origUnits } = await supabase.from('curriculum_units').select('*').eq('course_id', share.course_id).order('order_index')
    const unitIdMap: Record<string, string> = {}

    for (const unit of origUnits || []) {
      const { data: newUnit } = await supabase
        .from('curriculum_units')
        .insert({ course_id: newCourse.id, title: unit.title, order_index: unit.order_index, summary: unit.summary })
        .select()
        .single()
      if (newUnit) unitIdMap[unit.id] = newUnit.id
    }

    // Clone lessons (with content — no need to regenerate)
    const { data: origLessons } = await supabase.from('lessons').select('*').eq('course_id', share.course_id).order('order_index')

    for (const lesson of origLessons || []) {
      await supabase.from('lessons').insert({
        course_id: newCourse.id,
        unit_id: unitIdMap[lesson.unit_id] || lesson.unit_id,
        title: lesson.title,
        objective: lesson.objective,
        difficulty: lesson.difficulty,
        order_index: lesson.order_index,
        estimated_minutes: lesson.estimated_minutes,
        content: lesson.content,
        examples: lesson.examples,
        key_terms: lesson.key_terms,
        recap: lesson.recap,
        visuals: lesson.visuals,
      })
    }

    // Clone source documents + chunks for RAG
    const { data: origDocs } = await supabase.from('source_documents').select('*').eq('course_id', share.course_id)
    for (const doc of origDocs || []) {
      const { data: newDoc } = await supabase
        .from('source_documents')
        .insert({ course_id: newCourse.id, filename: doc.filename, file_type: doc.file_type, raw_text: doc.raw_text })
        .select()
        .single()

      if (newDoc) {
        const { data: origChunks } = await supabase.from('document_chunks').select('content, chunk_index, embedding').eq('document_id', doc.id)
        for (const chunk of origChunks || []) {
          await supabase.from('document_chunks').insert({
            document_id: newDoc.id,
            course_id: newCourse.id,
            content: chunk.content,
            chunk_index: chunk.chunk_index,
            embedding: chunk.embedding,
          })
        }
      }
    }

    // Record the share claim
    await supabase.from('shared_courses').insert({
      course_id: share.course_id,
      owner_id: share.owner_id,
      shared_with_id: userRec.id,
      share_code: code + '_claimed_' + userRec.id,
    })

    return NextResponse.json({ status: 'claimed', courseId: newCourse.id })
  } catch (e) {
    console.error('Share claim error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
