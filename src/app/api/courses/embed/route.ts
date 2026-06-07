import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateEmbedding } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/courses/embed
 * Body: { courseId: string }
 *
 * Creates source_documents and document_chunks with embeddings
 * from existing lesson content. Used after importing structured courses
 * so the Q&A instructor has material to reference.
 */
export async function POST(req: NextRequest) {
  try {
    const { courseId } = await req.json()
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    const supabase = createServiceClient()

    // Check if source docs already exist
    const { data: existingDocs } = await supabase
      .from('source_documents')
      .select('id')
      .eq('course_id', courseId)
      .limit(1)

    if (existingDocs && existingDocs.length > 0) {
      return NextResponse.json({ status: 'already_embedded', message: 'Source documents already exist' })
    }

    // Get all lessons for this course
    const { data: lessons } = await supabase
      .from('lessons')
      .select('title, objective, content, examples, key_terms, recap')
      .eq('course_id', courseId)
      .order('order_index')

    if (!lessons || lessons.length === 0) {
      return NextResponse.json({ error: 'No lessons found' }, { status: 404 })
    }

    // Build combined source text from all lessons
    const rawText = lessons.map(l => {
      const parts = [l.title, l.objective, l.content, l.examples, l.recap]
      if (Array.isArray(l.key_terms)) parts.push(l.key_terms.join('\n'))
      return parts.filter(Boolean).join('\n\n')
    }).join('\n\n---\n\n')

    // Save as source document
    const { data: sourceDoc } = await supabase
      .from('source_documents')
      .insert({ course_id: courseId, filename: 'imported_lessons.txt', file_type: 'text', raw_text: rawText })
      .select('id')
      .single()

    if (!sourceDoc) {
      return NextResponse.json({ error: 'Failed to create source document' }, { status: 500 })
    }

    // Chunk the text (~500 tokens per chunk with overlap)
    const chunkSize = 1500 // characters (~375 tokens)
    const overlap = 200
    const chunks: { content: string; chunk_index: number }[] = []
    let pos = 0
    let idx = 0

    while (pos < rawText.length) {
      const end = Math.min(pos + chunkSize, rawText.length)
      chunks.push({ content: rawText.slice(pos, end), chunk_index: idx })
      pos = end - overlap
      idx++
    }

    // Generate embeddings and insert chunks (batch of 5 at a time)
    let embedded = 0
    for (let i = 0; i < chunks.length; i += 5) {
      const batch = chunks.slice(i, i + 5)
      const embeddings = await Promise.all(
        batch.map(c => generateEmbedding(c.content.slice(0, 8000)))
      )

      const rows = batch.map((c, j) => ({
        document_id: sourceDoc.id,
        course_id: courseId,
        content: c.content,
        chunk_index: c.chunk_index,
        embedding: JSON.stringify(embeddings[j]),
      }))

      await supabase.from('document_chunks').insert(rows)
      embedded += rows.length
    }

    return NextResponse.json({ status: 'embedded', chunks: embedded, sourceDocId: sourceDoc.id })
  } catch (e) {
    console.error('Embed error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
