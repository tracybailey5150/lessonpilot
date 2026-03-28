import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    // Handle YouTube specially
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
      return NextResponse.json({
        title: `YouTube Video${videoId ? ` (${videoId})` : ''}`,
        text: `YouTube video resource: ${url}`,
        url,
        type: 'youtube',
      })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `URL returned ${res.status}`, url }, { status: 400 })
    }

    const html = await res.text()
    const text = stripHtml(html).slice(0, 8000)

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? stripHtml(titleMatch[1]).trim() : url

    return NextResponse.json({ title, text, url, type: 'article' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
