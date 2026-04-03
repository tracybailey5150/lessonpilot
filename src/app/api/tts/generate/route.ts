import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { text, voice = 'onyx' } = await req.json()
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })

    const truncated = text.slice(0, 4096)

    const response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: voice as 'onyx' | 'echo' | 'alloy' | 'fable' | 'nova' | 'shimmer',
      input: truncated,
      response_format: 'mp3',
      speed: 1.0,
    })

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    console.error('TTS error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
