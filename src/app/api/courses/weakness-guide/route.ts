import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId')
    const unitId = req.nextUrl.searchParams.get('unitId')
    const userId = req.nextUrl.searchParams.get('userId')
    if (!courseId || !userId) return NextResponse.json({ error: 'courseId and userId required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    // Get units — if unitId specified, just that one; otherwise all
    let unitFilter = supabase.from('curriculum_units').select('*').eq('course_id', courseId).order('order_index')
    if (unitId) unitFilter = unitFilter.eq('id', unitId)
    const { data: units } = await unitFilter

    if (!units || units.length === 0) return NextResponse.json({ error: 'No units found' }, { status: 404 })

    // Get all lessons for these units
    const unitIds = units.map(u => u.id)
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .in('unit_id', unitIds)
      .order('order_index')

    // Get review queue (weakness data) for this user's lessons
    const lessonIds = (lessons || []).map(l => l.id)
    const { data: weaknesses } = await supabase
      .from('review_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .in('lesson_id', lessonIds)

    // Get progress/scores
    const { data: progressData } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .in('lesson_id', lessonIds)

    const progressMap: Record<string, { score: number; status: string }> = {}
    for (const p of progressData || []) {
      progressMap[p.lesson_id] = { score: p.score ?? 0, status: p.status }
    }

    const weaknessMap: Record<string, any> = {}
    for (const w of weaknesses || []) {
      weaknessMap[w.lesson_id] = w
    }

    // Build per-unit weakness data
    const unitGuides: { unitTitle: string; weakLessons: { title: string; score: number; missedQuestions: any[]; content: string; keyTerms: string[] }[] }[] = []

    for (const unit of units) {
      const unitLessons = (lessons || []).filter(l => l.unit_id === unit.id)
      const weakLessons = unitLessons
        .filter(l => {
          const prog = progressMap[l.id]
          return prog && prog.score < 70
        })
        .map(l => ({
          title: l.title,
          score: progressMap[l.id]?.score ?? 0,
          missedQuestions: weaknessMap[l.id]?.missed_questions || [],
          content: l.content || '',
          keyTerms: Array.isArray(l.key_terms) ? l.key_terms : [],
        }))

      if (weakLessons.length > 0) {
        unitGuides.push({ unitTitle: unit.title, weakLessons })
      }
    }

    if (unitGuides.length === 0) {
      // No weaknesses — generate a "you're doing great" page
      return generateHTML(course.title, units.map(u => u.title), [])
    }

    // Use AI to generate targeted review content for each weak area
    const aiSections: { unitTitle: string; reviewContent: string }[] = []

    for (const ug of unitGuides) {
      const missedContext = ug.weakLessons.map(l => {
        let ctx = `Lesson: ${l.title} (scored ${l.score}%)\n`
        if (l.missedQuestions.length > 0) {
          ctx += 'Missed questions:\n' + l.missedQuestions.map((q: any) => `- Q: ${q.question}\n  Correct: ${q.correct_answer}`).join('\n') + '\n'
        }
        if (l.keyTerms.length > 0) {
          ctx += 'Key terms to review: ' + l.keyTerms.join(', ') + '\n'
        }
        return ctx
      }).join('\n---\n')

      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: 'You are a study coach. Write a focused review guide for a student who struggled with specific topics. Be encouraging but direct. Use clear explanations, mnemonics, and practice tips. No markdown — use plain text with clear headings.' },
            { role: 'user', content: `Write a targeted study guide for the weak areas in "${ug.unitTitle}".\n\nCourse: ${course.title}\nLevel: ${course.level}\n\nWeak areas:\n${missedContext}\n\nCreate a 400-600 word focused review covering:\n1. Quick recap of the concepts they missed\n2. Why these concepts matter\n3. Memory tricks or mnemonics\n4. 3 practice questions to test themselves` },
          ],
          temperature: 0.7,
        })
        aiSections.push({ unitTitle: ug.unitTitle, reviewContent: res.choices[0].message.content || '' })
      } catch {
        aiSections.push({
          unitTitle: ug.unitTitle,
          reviewContent: ug.weakLessons.map(l =>
            `Review: ${l.title} (${l.score}%)\n${l.missedQuestions.map((q: any) => `- ${q.question} → ${q.correct_answer}`).join('\n')}`
          ).join('\n\n'),
        })
      }
    }

    return generateHTML(course.title, units.map(u => u.title), aiSections)
  } catch (e) {
    console.error('Weakness guide error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function generateHTML(courseTitle: string, unitTitles: string[], sections: { unitTitle: string; reviewContent: string }[]) {
  const noWeakness = sections.length === 0

  let html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${courseTitle} — Weakness Study Guide</title>
<style>
  @media print { body { font-size: 11pt; } .no-print { display: none; } }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px 32px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 26px; border-bottom: 3px solid #ef4444; padding-bottom: 12px; }
  h2 { font-size: 20px; margin-top: 36px; color: #dc2626; border-bottom: 1px solid #fecaca; padding-bottom: 6px; }
  .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
  .section { margin-bottom: 32px; white-space: pre-wrap; line-height: 1.8; }
  .success { text-align: center; padding: 60px 20px; }
  .success h2 { color: #16a34a; border-bottom-color: #bbf7d0; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; }
  hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

<h1>📋 Weakness Study Guide</h1>
<div class="meta">${courseTitle} · Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
`

  if (noWeakness) {
    html += `<div class="success">
  <h2>🎉 No Weak Areas Found!</h2>
  <p>You're performing well across all sections. Keep up the great work.</p>
  <p>As you continue through quizzes, any areas that need review will automatically appear here.</p>
</div>`
  } else {
    html += `<p><strong>This guide focuses on the areas where your quiz scores were below 70%.</strong> Review these sections carefully before retaking quizzes.</p><hr>`

    for (const section of sections) {
      html += `<h2>📌 ${section.unitTitle}</h2>\n<div class="section">${section.reviewContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>\n<hr>`
    }
  }

  html += `<div style="text-align:center;color:#999;font-size:12px;margin-top:40px">
  Generated by LessonPilot · Focus on your weak areas, then retake the quizzes.
</div></body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
