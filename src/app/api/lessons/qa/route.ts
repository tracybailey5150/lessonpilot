import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai, generateEmbedding } from '@/lib/openai'

export const dynamic = 'force-dynamic'

/**
 * POST /api/lessons/qa
 * Body: { lessonId: string, question: string }
 *
 * Embeds the user question, searches document_chunks for the lesson's course,
 * and returns an answer grounded in the source material.
 */
export async function POST(req: NextRequest) {
  try {
    const { lessonId, question } = await req.json()
    if (!lessonId || !question?.trim()) {
      return NextResponse.json({ error: 'lessonId and question are required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get lesson + course context
    const { data: lesson } = await supabase
      .from('lessons')
      .select('title, objective, course_id, courses(title, subject, level)')
      .eq('id', lessonId)
      .single()

    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    // Embed the question and find relevant chunks
    const queryEmbedding = await generateEmbedding(question)
    const { data: chunks } = await supabase.rpc('match_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      course_id_filter: lesson.course_id,
      match_count: 5,
    })

    let context = ''
    if (chunks && chunks.length > 0) {
      context = chunks.map((c: { content: string; similarity: number }) => c.content).join('\n\n')
    } else {
      // Fallback: pull raw text from source document
      const { data: docs } = await supabase
        .from('source_documents')
        .select('raw_text')
        .eq('course_id', lesson.course_id)
        .limit(1)
      context = docs?.[0]?.raw_text?.slice(0, 3000) ?? ''
    }

    const course = lesson.courses as any

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `You are a knowledgeable tutor helping a student learn "${course?.title ?? 'this course'}". 
Answer questions clearly and concisely. Ground your answers in the provided source material.
If the answer isn't in the source material, say so honestly and answer from general knowledge.`
        },
        {
          role: 'user',
          content: `Lesson: ${lesson.title}
Lesson objective: ${lesson.objective}

Source material:
${context}

Student question: ${question}`
        }
      ],
      temperature: 0.5,
      max_tokens: 600,
    })

    const answer = response.choices[0].message.content ?? 'I was unable to generate an answer. Please try again.'

    return NextResponse.json({ answer, sourceChunks: chunks?.length ?? 0 })
  } catch (e) {
    console.error('Q&A error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
