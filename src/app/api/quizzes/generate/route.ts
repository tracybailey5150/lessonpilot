import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { lessonId } = await req.json()
    const supabase = createServiceClient()

    const { data: lesson } = await supabase.from('lessons').select('*').eq('id', lessonId).single()
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const content = `${lesson.title}\n${lesson.objective}\n${lesson.content || ''}\n${lesson.examples || ''}`

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: 'system',
          content: 'You are a quiz generator. Return ONLY valid JSON, no markdown, no code blocks.'
        },
        {
          role: 'user',
          content: `Generate a 5-question quiz for this lesson. Mix multiple choice and short answer.
Return JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": "A"
    },
    {
      "id": "q2",
      "type": "short_answer",
      "question": "...",
      "correct": "ideal answer"
    }
  ],
  "answerKey": { "q1": "A", "q2": "ideal answer" }
}

Lesson content:
${content.slice(0, 4000)}`
        }
      ],
      temperature: 0.7,
    })

    let quizData: { questions: unknown[]; answerKey: Record<string, string> } = { questions: [], answerKey: {} }
    try {
      const raw = response.choices[0].message.content ?? '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      quizData = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz' }, { status: 500 })
    }

    // Upsert quiz
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .upsert(
        { lesson_id: lessonId, questions: quizData.questions, answer_key: quizData.answerKey },
        { onConflict: 'lesson_id' }
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ quiz })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
