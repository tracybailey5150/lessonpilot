import { createServiceClient } from '@/lib/supabase'

interface ImportLesson {
  title: string
  module: string
  lessonNumber: number
  estimatedMinutes?: number
  teachingStyle?: string
  difficulty?: string
  domainAlignment?: string
  sourceSections?: string
  overview: string
  learningObjectives: string[]
  keyTerms: { term: string; definition: string }[]
  content: string
  scenarios?: { situation: string; notice: string; nextStep: string; whyMatters: string }[]
  workedExamples?: { given: string; asked: string; solution: string; answer: string; wrongApproach?: string }[]
  examRelevance?: string
  knowledgeCheck?: { question: string; type?: string; options?: string[]; answer: string; explanation: string; domain?: string }[]
  practicalAssignment?: string
  studyNotes?: { memorize?: string[]; understand?: string[]; practice?: string[]; examTraps?: string[]; fieldTip?: string }
  summary: string
}

interface ImportPayload {
  title: string
  subject: string
  level: string
  goal: string
  teachingStyle: string
  courseFormat: string
  durationDays?: number
  voiceId?: string
  userId: string
  modules: { title: string; summary: string }[]
  lessons: ImportLesson[]
}

export async function POST(req: Request) {
  const payload: ImportPayload = await req.json()

  if (!payload.title || !payload.userId || !payload.lessons?.length) {
    return Response.json({ error: 'Missing title, userId, or lessons' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get or create user record
  let { data: userRec } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_auth_id', payload.userId)
    .single()

  if (!userRec) {
    const { data: newUser } = await supabase
      .from('users')
      .insert({ supabase_auth_id: payload.userId, email: '' })
      .select('id')
      .single()
    userRec = newUser
  }

  if (!userRec) {
    return Response.json({ error: 'Failed to resolve user' }, { status: 500 })
  }

  // Create course
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .insert({
      user_id: userRec.id,
      title: payload.title,
      subject: payload.subject || '',
      level: payload.level || 'intermediate',
      goal: payload.goal || '',
      teaching_style: payload.teachingStyle || 'step-by-step',
      course_format: payload.courseFormat || 'self-paced',
      duration_days: payload.durationDays || null,
      voice_id: payload.voiceId || 'onyx',
    })
    .select('id')
    .single()

  if (courseErr || !course) {
    return Response.json({ error: courseErr?.message || 'Failed to create course' }, { status: 500 })
  }

  // Create modules/units
  const moduleMap: Record<string, string> = {}
  for (let i = 0; i < payload.modules.length; i++) {
    const mod = payload.modules[i]
    const { data: unit } = await supabase
      .from('curriculum_units')
      .insert({
        course_id: course.id,
        title: mod.title,
        summary: mod.summary,
        order_index: i,
      })
      .select('id')
      .single()
    if (unit) moduleMap[mod.title] = unit.id
  }

  // Create lessons with full structured content
  for (let i = 0; i < payload.lessons.length; i++) {
    const lesson = payload.lessons[i]
    const unitId = moduleMap[lesson.module] || Object.values(moduleMap)[0]

    // Build rich content from structured fields
    const contentParts: string[] = []

    if (lesson.overview) {
      contentParts.push(`OVERVIEW\n${lesson.overview}`)
    }

    if (lesson.learningObjectives?.length) {
      contentParts.push(`LEARNING OBJECTIVES\n${lesson.learningObjectives.map((o, j) => `${j + 1}. ${o}`).join('\n')}`)
    }

    contentParts.push(lesson.content)

    if (lesson.scenarios?.length) {
      contentParts.push(`PRACTICAL AV SCENARIOS\n${lesson.scenarios.map((s, j) => `Scenario ${j + 1}: ${s.situation}\nWhat to notice: ${s.notice}\nBest next step: ${s.nextStep}\nWhy it matters: ${s.whyMatters}`).join('\n\n')}`)
    }

    if (lesson.workedExamples?.length) {
      contentParts.push(`WORKED EXAMPLES\n${lesson.workedExamples.map((w, j) => `Example ${j + 1}\nGiven: ${w.given}\nAsked: ${w.asked}\nSolution: ${w.solution}\nAnswer: ${w.answer}${w.wrongApproach ? `\nCommon wrong approach: ${w.wrongApproach}` : ''}`).join('\n\n')}`)
    }

    if (lesson.examRelevance) {
      contentParts.push(`CTS EXAM RELEVANCE\n${lesson.examRelevance}`)
    }

    if (lesson.practicalAssignment) {
      contentParts.push(`PRACTICAL ASSIGNMENT\n${lesson.practicalAssignment}`)
    }

    if (lesson.studyNotes) {
      const notes: string[] = []
      if (lesson.studyNotes.memorize?.length) notes.push(`Memorize: ${lesson.studyNotes.memorize.join('; ')}`)
      if (lesson.studyNotes.understand?.length) notes.push(`Understand: ${lesson.studyNotes.understand.join('; ')}`)
      if (lesson.studyNotes.practice?.length) notes.push(`Practice: ${lesson.studyNotes.practice.join('; ')}`)
      if (lesson.studyNotes.examTraps?.length) notes.push(`Exam traps: ${lesson.studyNotes.examTraps.join('; ')}`)
      if (lesson.studyNotes.fieldTip) notes.push(`Field tip: ${lesson.studyNotes.fieldTip}`)
      contentParts.push(`STUDY NOTES\n${notes.join('\n')}`)
    }

    if (lesson.summary) {
      contentParts.push(`SUMMARY\n${lesson.summary}`)
    }

    const fullContent = contentParts.join('\n\n---\n\n')

    // Key terms as JSON array
    const keyTerms = lesson.keyTerms?.map(kt => `${kt.term}: ${kt.definition}`) || []

    // Knowledge check as examples field
    const examples = lesson.knowledgeCheck?.map((q, j) =>
      `Q${j + 1}. ${q.question}${q.options ? '\n' + q.options.map((o, k) => `  ${String.fromCharCode(65 + k)}. ${o}`).join('\n') : ''}\nAnswer: ${q.answer}\n${q.explanation}`
    ).join('\n\n') || ''

    // Recap from summary
    const recap = lesson.summary || ''

    await supabase.from('lessons').insert({
      course_id: course.id,
      unit_id: unitId,
      title: lesson.title,
      objective: lesson.overview?.substring(0, 200) || '',
      difficulty: lesson.difficulty || 'intermediate',
      order_index: i,
      estimated_minutes: lesson.estimatedMinutes || 60,
      content: fullContent,
      key_terms: keyTerms,
      examples,
      recap,
      visuals: lesson.domainAlignment ? [{ type: 'callout', title: 'CTS Domain', data: lesson.domainAlignment }] : null,
    })
  }

  return Response.json({ courseId: course.id, lessonsImported: payload.lessons.length })
}
