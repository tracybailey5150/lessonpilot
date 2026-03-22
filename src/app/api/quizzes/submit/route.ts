import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Question {
  id: string
  type: 'multiple_choice' | 'short_answer'
  question: string
  options?: string[]
  correct?: string
}

export async function POST(req: NextRequest) {
  try {
    const { lessonId, userId, answers, courseId } = await req.json()
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

    const { data: quiz } = await supabase.from('quizzes').select('*').eq('lesson_id', lessonId).single()
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

    const questions: Question[] = Array.isArray(quiz.questions) ? quiz.questions : []
    const answerKey: Record<string, string> = quiz.answer_key || {}

    // Normalize answers: support both array [{questionId, answer}] and object {q1: "A"} formats
    const answersMap: Record<string, string> = Array.isArray(answers)
      ? Object.fromEntries(answers.map((a: { questionId: string; answer: string }) => [a.questionId, a.answer]))
      : (answers || {})

    let correct = 0
    const feedback: string[] = []

    for (const q of questions) {
      const userAnswer = (answersMap[q.id] || '').toString().trim().toLowerCase()
      const correctAnswer = (answerKey[q.id] || q.correct || '').toString().trim().toLowerCase()

      if (q.type === 'multiple_choice') {
        if (userAnswer === correctAnswer) {
          correct++
          feedback.push(`✓ Q: ${q.question.slice(0, 60)}...`)
        } else {
          feedback.push(`✗ Q: ${q.question.slice(0, 60)}... (Correct: ${answerKey[q.id] || q.correct})`)
        }
      } else {
        // Short answer: check if key words present
        const keyWords = correctAnswer.split(' ').filter(w => w.length > 4)
        const matchedWords = keyWords.filter(w => userAnswer.includes(w))
        const partialScore = keyWords.length > 0 ? matchedWords.length / keyWords.length : 0
        if (partialScore >= 0.5) {
          correct++
          feedback.push(`✓ Q: ${q.question.slice(0, 60)}...`)
        } else {
          feedback.push(`✗ Q: ${q.question.slice(0, 60)}... (Expected: ${correctAnswer.slice(0, 80)})`)
        }
      }
    }

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
    const passed = score >= 70

    // Update progress
    await supabase.from('progress').upsert({
      user_id: internalUserId,
      course_id: courseId,
      lesson_id: lessonId,
      status: passed ? 'completed' : 'in_progress',
      score,
      mastery_level: passed ? 1 : 0,
      attempts: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })

    // Add to review queue if failed
    if (!passed) {
      await supabase.from('review_queue').insert({
        user_id: internalUserId,
        course_id: courseId,
        lesson_id: lessonId,
        weakness_score: score,
        retry_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    return NextResponse.json({ score, feedback, passed, correct, total: questions.length })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
