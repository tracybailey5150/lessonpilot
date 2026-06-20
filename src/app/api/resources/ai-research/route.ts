import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

// Detect certification/exam courses
const CERT_KEYWORDS = [
  'pmp', 'capm', 'comptia', 'a+', 'network+', 'security+', 'aws', 'azure', 'gcp',
  'cisco', 'ccna', 'ccnp', 'cisa', 'cissp', 'ceh', 'itil', 'scrum', 'csm', 'safe',
  'six sigma', 'lean', 'prince2', 'togaf', 'cfa', 'cpa', 'series 7', 'series 65',
  'real estate', 'bar exam', 'mcat', 'lsat', 'gre', 'gmat', 'nclex', 'usmle',
  'certification', 'exam prep', 'license exam', 'board exam',
]

function isCertExam(topic: string, subject: string, level: string): boolean {
  const combined = `${topic} ${subject} ${level}`.toLowerCase()
  return CERT_KEYWORDS.some(k => combined.includes(k))
}

export async function POST(req: NextRequest) {
  try {
    const { topic, subject, level = 'intermediate' } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

    const isCert = isCertExam(topic, subject || '', level)

    const certPrompt = isCert ? `
CRITICAL: This is a CERTIFICATION/EXAM PREP course. Your research MUST focus on:
1. The EXACT exam structure — how many questions, time limit, passing score, question types
2. ALL official exam domains/objectives with their weight percentages
3. Key formulas, frameworks, and concepts that are TESTED on the actual exam
4. Common exam traps, trick questions, and how to avoid them
5. The difference between what sounds right and what the exam considers correct
6. Official study resources from the certifying body (PMI, CompTIA, AWS, etc.)
7. The most frequently missed topics based on real exam takers

Your seed knowledge base MUST cover every exam domain with testable detail — not general overviews.
Include specific facts, numbers, processes, and definitions that appear on the actual exam.
` : ''

    const res = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{
        role: 'user',
        content: `You are a curriculum researcher${isCert ? ' specializing in certification exam preparation' : ''}. For the topic "${topic}" (subject: ${subject}, level: ${level}), provide:

1. A curated list of 8-10 real, specific, high-quality resources
2. A comprehensive seed knowledge base (${isCert ? '~4000' : '~2500'} words) on this topic
${certPrompt}
Return ONLY valid JSON:
{
  "resources": [
    {
      "title": "string",
      "url": "string (real URL — use only well-known sites: ${isCert ? 'pmi.org, comptia.org, aws.amazon.com/certification, learn.microsoft.com, cisco.com, ' : ''}hbr.org, mckinsey.com, mit.edu, coursera.org, youtube.com, wikipedia.org, arxiv.org, etc.)",
      "type": "article|book|video|course|paper|website",
      "description": "string (1 sentence why this is valuable${isCert ? ' for passing the exam' : ''})"
    }
  ],
  "seedText": "string (${isCert ? '4000' : '2500'} words of comprehensive, accurate content covering ${isCert ? 'ALL exam domains and testable material' : 'this topic'} at the ${level} level — this becomes the knowledge base for generating lessons)"
}

IMPORTANT: Only include URLs from major, reputable domains. Do not invent article URLs — use homepage or search URLs if you are not 100% sure of the exact path.`
      }],
      temperature: 0.5,
      max_tokens: isCert ? 6000 : 4000,
    })

    const raw = res.choices[0].message.content || '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    try {
      const data = JSON.parse(match ? match[0] : raw)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
