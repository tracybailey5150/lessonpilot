import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { openai, generateEmbedding } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — enough for 12 lessons

/**
 * POST /api/courses/pregenerate
 * Fire-and-forget: generates all lesson content sequentially after course creation.
 * The frontend calls this immediately after getting the courseId back.
 * Lessons are generated one-by-one so the first ones are ready fast.
 */
export async function POST(req: NextRequest) {
  try {
    const { courseId } = await req.json()
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, title, objective, content, course_id, unit_id')
      .eq('course_id', courseId)
      .is('content', null)
      .order('order_index')

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({ status: 'all_ready', generated: 0 })
    }

    const teachingStyle = course.teaching_style || 'step-by-step'
    const level = course.level || 'beginner'
    const isBootcamp = course.course_format === 'bootcamp'
    const estimatedMin = isBootcamp ? 45 : 0

    const certKeywords = ['pmp', 'capm', 'comptia', 'a+', 'network+', 'security+', 'aws', 'azure', 'cisco', 'ccna', 'cissp', 'ceh', 'itil', 'scrum', 'csm', 'six sigma', 'certification', 'exam prep']
    const courseText = `${course.title} ${course.subject} ${course.goal}`.toLowerCase()
    const isCertExam = certKeywords.some(k => courseText.includes(k))

    // Get source context once (shared across all lessons)
    let fallbackContext = ''
    const { data: docs } = await supabase
      .from('source_documents')
      .select('raw_text')
      .eq('course_id', courseId)
      .limit(1)
    if (docs?.[0]?.raw_text) {
      fallbackContext = docs[0].raw_text.slice(0, 3000)
    }

    let generated = 0

    for (const lesson of lessons) {
      try {
        // Get relevant chunks via RAG
        let sourceContext = fallbackContext
        try {
          const queryEmbedding = await generateEmbedding(`${lesson.title} ${lesson.objective}`)
          const { data: chunks } = await supabase.rpc('match_chunks', {
            query_embedding: JSON.stringify(queryEmbedding),
            course_id_filter: courseId,
            match_count: 5,
          })
          if (chunks && chunks.length > 0) {
            sourceContext = chunks.map((c: { content: string }) => c.content).join('\n\n')
          }
        } catch {}

        const response = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: 'You are a personalized teaching agent. Return ONLY valid JSON, no markdown, no code blocks.'
            },
            {
              role: 'user',
              content: `Generate a complete lesson with visual learning aids. Return JSON with these exact fields:
{
  "content": "detailed lesson explanation (plain text, no markdown, ${estimatedMin >= 30 ? '1500-2500 words' : '300-600 words'})",
  "examples": "${estimatedMin >= 30 ? '4-6 detailed examples' : '2-3 examples'} (plain text)",
  "keyTerms": ["term: definition"${estimatedMin >= 30 ? ' — include 10-15 key terms' : ''}],
  "recap": "${estimatedMin >= 30 ? 'comprehensive 6-8 sentence summary' : 'brief 3-4 sentence summary'}",
  "visuals": [{"type":"table|flowchart|comparison|timeline|concept_map|callout","title":"string","data":"varies by type"}]
}

${estimatedMin >= 30 ? `This is a ${estimatedMin}-minute intensive training section. Be thorough and detailed.` : ''}
${isCertExam ? 'EXAM PREP: Focus on testable material, exam question patterns, mnemonics.' : ''}

Teaching style: ${teachingStyle}
Level: ${level}
Topic: ${lesson.title}
Objective: ${lesson.objective}
${sourceContext ? `Source material:\n${sourceContext}` : ''}`
            }
          ],
          temperature: 0.7,
        })

        let lessonContent: any = { content: '', examples: '', keyTerms: [], recap: '', visuals: [] }
        try {
          const raw = response.choices[0].message.content ?? '{}'
          const jsonMatch = raw.match(/\{[\s\S]*\}/)
          lessonContent = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
        } catch {
          lessonContent.content = response.choices[0].message.content ?? ''
        }

        await supabase.from('lessons').update({
          content: lessonContent.content,
          examples: lessonContent.examples,
          key_terms: lessonContent.keyTerms,
          recap: lessonContent.recap,
          visuals: lessonContent.visuals || [],
        }).eq('id', lesson.id)

        generated++
      } catch (err) {
        console.error(`Pregenerate lesson ${lesson.id} failed:`, err)
        // Continue to next lesson
      }
    }

    return NextResponse.json({ status: 'done', generated, total: lessons.length })
  } catch (e) {
    console.error('Pregenerate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
