import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { lessonId } = await req.json()
    const supabase = createServiceClient()

    const { data: lesson } = await supabase.from('lessons').select('*, courses(title, subject, goal)').eq('id', lessonId).single()
    if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    const course = lesson.courses as any
    const certKeywords = ['pmp', 'capm', 'comptia', 'a+', 'network+', 'security+', 'aws', 'azure', 'cisco', 'ccna', 'cissp', 'ceh', 'itil', 'scrum', 'csm', 'six sigma', 'certification', 'exam prep']
    const courseText = `${course?.title || ''} ${course?.subject || ''} ${course?.goal || ''}`.toLowerCase()
    const isCertExam = certKeywords.some(k => courseText.includes(k))

    const content = `${lesson.title}\n${lesson.objective}\n${lesson.content || ''}\n${lesson.examples || ''}`

    const certQuizInstructions = isCertExam ? `
EXAM PREP MODE: Generate questions that mirror REAL certification exam questions:
- Use the same question style and wording as the actual exam
- Include realistic distractors (wrong answers that seem plausible)
- Add "situational" questions: "A project manager is in this situation... what should they do?"
- Include questions where 2+ answers seem correct but only one is the BEST answer
- Test exact terminology, processes, and frameworks from the exam
- Make this feel like a practice exam, not a classroom quiz
` : ''

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: 'system',
          content: `You are a quiz generator${isCertExam ? ' specializing in certification exam practice questions' : ''}. Return ONLY valid JSON, no markdown, no code blocks.`
        },
        {
          role: 'user',
          content: `Generate a ${isCertExam ? '7' : '5'}-question quiz for this lesson. ${isCertExam ? 'Use mostly multiple choice (exam style).' : 'Mix multiple choice and short answer.'}
${certQuizInstructions}
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
      "type": "${isCertExam ? 'multiple_choice' : 'short_answer'}",
      "question": "...",
      ${isCertExam ? '"options": ["A", "B", "C", "D"],' : ''}
      "correct": "${isCertExam ? 'B' : 'ideal answer'}"
    }
  ],
  "answerKey": { "q1": "A", "q2": "${isCertExam ? 'B' : 'ideal answer'}" }
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
