import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { topic, subject, level = 'intermediate' } = await req.json()
    if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 })

    const res = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{
        role: 'user',
        content: `You are a curriculum researcher. For the topic "${topic}" (subject: ${subject}, level: ${level}), provide:

1. A curated list of 8-10 real, specific, high-quality resources
2. A comprehensive seed knowledge base (~2500 words) on this topic

Return ONLY valid JSON:
{
  "resources": [
    {
      "title": "string",
      "url": "string (real URL — use only well-known sites: hbr.org, mckinsey.com, mit.edu, coursera.org, youtube.com, wikipedia.org, arxiv.org, etc.)",
      "type": "article|book|video|course|paper|website",
      "description": "string (1 sentence why this is valuable)"
    }
  ],
  "seedText": "string (2500 words of comprehensive, accurate content covering this topic at the ${level} level — this becomes the knowledge base for generating lessons)"
}

IMPORTANT: Only include URLs from major, reputable domains. Do not invent article URLs — use homepage or search URLs for HBR/McKinsey if you are not 100% sure of the exact path.`
      }],
      temperature: 0.7,
      max_tokens: 4000,
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
