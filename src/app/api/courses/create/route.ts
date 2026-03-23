import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai, generateEmbedding } from '@/lib/openai'

export const dynamic = 'force-dynamic'

interface LessonOutline {
  title: string
  objective: string
  difficulty: string
}

interface UnitOutline {
  title: string
  summary: string
  lessons: LessonOutline[]
}

interface CurriculumResult {
  units: UnitOutline[]
}

export async function POST(req: NextRequest) {
  try {
    const { title, subject, level, goal, teachingStyle, rawText, userId: supabaseAuthId } = await req.json()
    const supabase = createServiceClient()

    // Get user record
    const { data: userRec } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_auth_id', supabaseAuthId)
      .single()

    if (!userRec) {
      // Create user if not exists
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({ supabase_auth_id: supabaseAuthId, email: '' })
        .select()
        .single()
      if (userErr) return NextResponse.json({ error: 'User not found' }, { status: 400 })
    }

    const dbUserId = userRec?.id ?? (await supabase.from('users').select('id').eq('supabase_auth_id', supabaseAuthId).single()).data?.id

    // Create course
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .insert({ user_id: dbUserId, title, subject, level, goal, teaching_style: teachingStyle || 'step-by-step' })
      .select()
      .single()

    if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 400 })

    // Save source document
    const { data: sourceDoc } = await supabase
      .from('source_documents')
      .insert({ course_id: course.id, filename: 'pasted_text.txt', file_type: 'text', raw_text: rawText })
      .select()
      .single()

    // Generate curriculum with GPT-4o
    const truncatedText = rawText.slice(0, 8000)
    const curriculumRes = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum designer. Return ONLY valid JSON, no markdown, no explanation.'
        },
        {
          role: 'user',
          content: `Given this learning material, create a structured curriculum.
Return JSON: { "units": [{ "title": "string", "summary": "string", "lessons": [{ "title": "string", "objective": "string", "difficulty": "beginner|intermediate|advanced" }] }] }
Maximum 5 units, 4 lessons per unit. Keep it focused and logical.

Material:
${truncatedText}`
        }
      ],
      temperature: 0.7,
    })

    let curriculum: CurriculumResult = { units: [] }
    try {
      const content = curriculumRes.choices[0].message.content ?? '{}'
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      curriculum = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch {
      // Fallback curriculum
      curriculum = {
        units: [{
          title: `Introduction to ${title}`,
          summary: `Core concepts of ${subject}`,
          lessons: [
            { title: 'Overview & Fundamentals', objective: `Understand the basics of ${subject}`, difficulty: level },
            { title: 'Core Concepts', objective: 'Master key ideas', difficulty: level },
          ]
        }]
      }
    }

    // Save units and lessons
    for (let i = 0; i < curriculum.units.length; i++) {
      const unit = curriculum.units[i]
      const { data: unitRec } = await supabase
        .from('curriculum_units')
        .insert({ course_id: course.id, title: unit.title, order_index: i, summary: unit.summary })
        .select()
        .single()

      if (unitRec && unit.lessons) {
        for (let j = 0; j < unit.lessons.length; j++) {
          const lesson = unit.lessons[j]
          await supabase.from('lessons').insert({
            course_id: course.id,
            unit_id: unitRec.id,
            title: lesson.title,
            objective: lesson.objective,
            difficulty: lesson.difficulty || level,
            order_index: j,
          })
        }
      }
    }

    // Generate embeddings for text chunks (background)
    if (sourceDoc) {
      const chunkSize = 1000
      const chunks: string[] = []
      for (let i = 0; i < rawText.length; i += chunkSize) {
        chunks.push(rawText.slice(i, i + chunkSize))
      }

      // Process first 10 chunks (rate limit consideration)
      const toProcess = chunks.slice(0, 10)
      for (let i = 0; i < toProcess.length; i++) {
        try {
          const embedding = await generateEmbedding(toProcess[i])
          await supabase.from('document_chunks').insert({
            document_id: sourceDoc.id,
            course_id: course.id,
            content: toProcess[i],
            chunk_index: i,
            embedding: JSON.stringify(embedding),
          })
        } catch {
          // Skip failed embeddings
        }
      }
    }

    return NextResponse.json({ courseId: course.id })
  } catch (e) {
    console.error('Course create error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
