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
    const isBootcamp = course?.course_format === 'bootcamp'
    const estimatedMin = lesson.estimated_minutes || (isBootcamp ? 45 : 0)

    // Detect cert exam courses
    const certKeywords = ['pmp', 'capm', 'comptia', 'a+', 'network+', 'security+', 'aws', 'azure', 'cisco', 'ccna', 'cissp', 'ceh', 'itil', 'scrum', 'csm', 'six sigma', 'certification', 'exam prep']
    const courseText = `${course?.title} ${course?.subject} ${course?.goal}`.toLowerCase()
    const isCertExam = certKeywords.some(k => courseText.includes(k))

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
          content: `Generate a complete lesson with visual learning aids. Return JSON with these exact fields:
{
  "content": "detailed lesson explanation (plain text, no markdown, ${estimatedMin >= 30 ? '1500-2500 words — this is a 45-minute intensive training section, be thorough and detailed' : '300-600 words'})",
  "examples": "${estimatedMin >= 30 ? '4-6 detailed, real-world examples with explanations (plain text)' : '2-3 concrete examples (plain text)'}",
  "keyTerms": ["term: definition", "term: definition"${estimatedMin >= 30 ? ' — include 10-15 key terms' : ''}],
  "recap": "${estimatedMin >= 30 ? 'comprehensive 6-8 sentence summary covering all key points' : 'brief 3-4 sentence summary'}",
  "checkQuestions": ["question 1", "question 2", "question 3"${estimatedMin >= 30 ? ', "question 4", "question 5" — include 5 review questions' : ''}],
  "visuals": [
    {
      "type": "table|flowchart|comparison|timeline|concept_map|callout",
      "title": "short title for this visual",
      "data": "content varies by type — see below"
    }
  ]
}

VISUAL AIDS — include 2-4 visuals that help explain the material:
- "table": data is a JSON array of rows, each row is an object with column headers as keys. Example: [{"Process":"Plan","Input":"Charter","Output":"Plan Doc"}]
- "flowchart": data is an array of steps as strings, shown as a sequential flow. Example: ["Initiate","Plan","Execute","Monitor","Close"]
- "comparison": data is an object with two keys to compare. Example: {"Predictive":["Defined scope","Sequential phases","Change controlled"],"Agile":["Evolving scope","Iterative sprints","Change embraced"]}
- "timeline": data is an array of {"label":"Phase 1","detail":"Description"} objects shown chronologically
- "concept_map": data is an object where keys are central concepts and values are arrays of related terms. Example: {"Risk Management":["Identify","Analyze","Plan Response","Monitor"]}
- "callout": data is a string — an important tip, warning, or exam note displayed prominently

Include visuals that genuinely help understanding — process flows for procedures, tables for comparisons, timelines for sequences, callouts for critical exam tips.
}

${estimatedMin >= 30 ? `IMPORTANT: This is a ${estimatedMin}-minute training section in an intensive bootcamp. The content MUST be substantial and detailed — cover the topic thoroughly with explanations, context, why it matters, how to apply it, common mistakes, and best practices. Do NOT write a brief overview. Write a COMPLETE lesson that takes 30-45 minutes to study.` : ''}
${isCertExam ? `EXAM PREP: This is a certification exam prep lesson. Focus on TESTABLE material:
- Include specific facts, numbers, and definitions the exam asks about
- Explain how the exam words questions on this topic and common wrong-answer traps
- Include mnemonics or memory tricks for key concepts
- Note which concepts are high-frequency exam questions
- Frame everything as "you need to know this for the exam"` : ''}

Teaching style: ${teachingStyle}
Level: ${level}
Topic: ${lesson.title}
Objective: ${lesson.objective}
${sourceContext ? `Source material:\n${sourceContext}` : ''}`
        }
      ],
      temperature: 0.7,
    })

    let lessonContent: any = { content: '', examples: '', keyTerms: [], recap: '', checkQuestions: [], visuals: [] }
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
      visuals: lessonContent.visuals || [],
    }).eq('id', lessonId)

    const { data: updatedLesson } = await supabase.from('lessons').select('*').eq('id', lessonId).single()

    return NextResponse.json({ lesson: updatedLesson })
  } catch (e) {
    console.error('Lesson generate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
