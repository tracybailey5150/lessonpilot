import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      const text = buffer.toString('utf-8')
      return NextResponse.json({ text })
    }

    if (fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(buffer)
      return NextResponse.json({ text: data.text })
    }

    // For .doc/.docx and other formats, try to extract text as utf-8
    const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim()
    return NextResponse.json({ text })
  } catch (e) {
    console.error('Parse document error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
