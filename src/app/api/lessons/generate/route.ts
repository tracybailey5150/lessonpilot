import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai, generateEmbedding } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { lessonId, userId } = await req.json()
    const supabase = createServiceClient()

    // Get lesson + course
    const { data: lesson } = await supabase
      .from('lessons')
      .select('*, courses(*)')
      .eq('id', lessonId)
      .single()

    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const course = lesson.courses
    const teachingStyle = course?.teaching_style || 'step-by-step'
    const level = course?.level || 'beginner'

    // Retrieve relevant chunks via embedding similarity
    let sourceContext = ''
    try {
      const queryEmbedding = await generateEmbedding(`${lesson.title} ${lesson.objective}`)
      const { data: chunks } = await supabase.rpc('match_chunks', {
        query_embedding: JSON.stringify(queryEmbedding),
        course_id_filter: lesson.course_id,
        match_count: 5,
      })
      if (chunks && chunks.length > 0) {
        sourceContext = chunks.map((c: { content: string }) => c.content).join('\n\n')
      }
    } catch {
      // Fallback: get raw text from source documents
      const { data: docs } = await supabase
        .from('source_documents')
        .select('raw_text')
        .eq('course_id', lesson.course_id)
        .limit(1)
      if (docs?.[0]?.raw_text) {
        sourceContext = docs[0].raw_text.slice(0, 3000)
      }
    }

    // Generate lesson content
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: 'system',
          content: 'You are a personalized teaching agent. Return ONLY valid JSON, no markdown, no code blocks.'
        },
        {
          role: 'user',
          content: `Generate a complete lesson. Return JSON with these exact fields:
{
  "content": "detailed lesson explanation (plain text, no markdown, 300-600 words)",
  "examples": "2-3 concrete examples (plain text)",
  "keyTerms": ["term: definition", "term: definition"],
  "recap": "brief 3-4 sentence summary",
  "checkQuestions": ["question 1", "question 2", "question 3"]
}

Teaching style: ${teachingStyle}
Level: ${level}
Topic: ${lesson.title}
Objective: ${lesson.objective}
${sourceContext ? `Source material:\n${sourceContext}` : ''}`
        }
      ],
      temperature: 0.7,
    })

    let lessonContent = { content: '', examples: '', keyTerms: [], recap: '', checkQuestions: [] }
    try {
      const raw = response.choices[0].message.content ?? '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      lessonContent = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      lessonContent.content = response.choices[0].message.content ?? 'Lesson content unavailable.'
    }

    // Save to lessons table
    await supabase.from('lessons').update({
      content: lessonContent.content,
      examples: lessonContent.examples,
      key_terms: lessonContent.keyTerms,
      recap: lessonContent.recap,
    }).eq('id', lessonId)

    const { data: updatedLesson } = await supabase.from('lessons').select('*').eq('id', lessonId).single()

    return NextResponse.json({ lesson: updatedLesson })
  } catch (e) {
    console.error('Lesson generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
