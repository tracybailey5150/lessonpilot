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

// Split text into ~500-token chunks with 50-token overlap (~4 chars per token)
function chunkText(text: string, chunkTokens = 500, overlapTokens = 50): string[] {
  const chunkSize = chunkTokens * 4
  const overlapSize = overlapTokens * 4
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += chunkSize - overlapSize
  }
  return chunks.filter(c => c.length > 50)
}

export async function POST(req: NextRequest) {
  try {
    const { title, subject, level, goal, teachingStyle, rawText, userId: supabaseAuthId, courseFormat, durationDays, sectionsPerDay } = await req.json()
    const isBootcamp = courseFormat === 'bootcamp'
    const days = isBootcamp ? parseInt(durationDays) || 3 : 0
    const sections = isBootcamp ? parseInt(sectionsPerDay) || 4 : 0
    const supabase = createServiceClient()

    // Get user record
    const { data: userRec } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_auth_id', supabaseAuthId)
      .single()

    if (!userRec) {
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
      .insert({
        user_id: dbUserId, title, subject, level, goal,
        teaching_style: teachingStyle || 'step-by-step',
        course_format: isBootcamp ? 'bootcamp' : 'self-paced',
        duration_days: days || null,
        sections_per_day: sections || null,
      })
      .select()
      .single()

    if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 400 })

    // Save source document
    const { data: sourceDoc } = await supabase
      .from('source_documents')
      .insert({ course_id: course.id, filename: 'pasted_text.txt', file_type: 'text', raw_text: rawText })
      .select()
      .single()

    // Generate curriculum with GPT-4
    const truncatedText = rawText.slice(0, 8000)

    const bootcampPrompt = isBootcamp
      ? `Design a ${days}-day intensive bootcamp curriculum. This is a FULL ${days}-day training program.

CRITICAL REQUIREMENTS:
- You MUST return EXACTLY ${days} units (one per day). Not fewer.
- Each unit MUST have EXACTLY ${sections} lessons (sections).
- Total lessons = ${days * sections}.
- Each section represents ~45 minutes of intensive study.
- Title units "Day 1: [Theme]", "Day 2: [Theme]", etc.
- Title lessons "Section 1: [Topic]", "Section 2: [Topic]", etc.
- Content must be SUBSTANTIAL enough for a real training day — not surface-level.
- Spread the material evenly across all ${days} days. Day 1 covers fundamentals, middle days cover core topics, final day covers advanced topics and review.

Return JSON: { "units": [{ "title": "Day 1: [theme]", "summary": "What this day covers in 2-3 sentences", "lessons": [{ "title": "Section 1: [topic]", "objective": "Detailed learning objective (2 sentences)", "difficulty": "beginner|intermediate|advanced", "estimated_minutes": 45 }] }] }

VERIFY: Your response must contain exactly ${days} units and exactly ${sections} lessons per unit.`
      : `Given this learning material, create a structured curriculum.
Return JSON: { "units": [{ "title": "string", "summary": "string", "lessons": [{ "title": "string", "objective": "string", "difficulty": "beginner|intermediate|advanced" }] }] }
Maximum 5 units, 4 lessons per unit. Keep it focused and logical.`

    const curriculumRes = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum designer. Return ONLY valid JSON, no markdown, no explanation.'
        },
        {
          role: 'user',
          content: `${bootcampPrompt}

Course: ${title}
Subject: ${subject}
Level: ${level}
Goal: ${goal}

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
            estimated_minutes: (lesson as any).estimated_minutes || null,
          })
        }
      }
    }

    // Embed all chunks with overlap — process in batches to avoid rate limits
    if (sourceDoc) {
      const chunks = chunkText(rawText)
      const BATCH_SIZE = 20
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE)
        await Promise.all(
          batch.map(async (chunk, j) => {
            try {
              const embedding = await generateEmbedding(chunk)
              await supabase.from('document_chunks').insert({
                document_id: sourceDoc.id,
                course_id: course.id,
                content: chunk,
                chunk_index: i + j,
                embedding: JSON.stringify(embedding),
              })
            } catch {
              // Skip failed chunks — lesson generation falls back to raw text
            }
          })
        )
      }
    }

    return NextResponse.json({ courseId: course.id })
  } catch (e) {
    console.error('Course create error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
