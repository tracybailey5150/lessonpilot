import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get('courseId')
    const unitId = req.nextUrl.searchParams.get('unitId') // optional — single day/unit
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    let unitsQuery = supabase.from('curriculum_units').select('*').eq('course_id', courseId).order('order_index')
    if (unitId) unitsQuery = unitsQuery.eq('id', unitId)
    const { data: units } = await unitsQuery

    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index')

    // Also fetch source material for reference
    const { data: sourceDocs } = await supabase
      .from('source_documents')
      .select('filename, raw_text')
      .eq('course_id', courseId)
      .limit(3)

    const isBootcamp = course.course_format === 'bootcamp'
    const isSingleUnit = !!unitId
    const unitLabel = isBootcamp ? 'Day' : 'Unit'
    const titleSuffix = isSingleUnit && units?.[0] ? ` — ${units[0].title}` : ''

    let html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${course.title}${titleSuffix} — Study Guide</title>
<style>
  @media print { body { font-size: 11pt; } .no-print { display: none; } @page { margin: 0.75in; } }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px 32px; color: #1a1a1a; line-height: 1.7; }
  h1 { font-size: 28px; margin-bottom: 4px; border-bottom: 3px solid #333; padding-bottom: 12px; }
  h2 { font-size: 22px; margin-top: 36px; color: #222; border-bottom: 1px solid #ccc; padding-bottom: 6px; page-break-before: auto; }
  h3 { font-size: 16px; margin-top: 20px; color: #444; }
  .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
  .meta span { margin-right: 16px; }
  .objective { background: #f5f5f5; padding: 10px 16px; border-left: 4px solid #6366f1; margin: 8px 0 12px; font-style: italic; color: #444; }
  .section { margin-bottom: 24px; }
  .content { margin: 8px 0; white-space: pre-wrap; }
  .key-terms { margin: 8px 0; }
  .key-terms li { margin-bottom: 4px; }
  .recap { background: #f0f9ff; padding: 12px 16px; border-radius: 6px; margin-top: 12px; }
  .time-badge { display: inline-block; background: #e8e8e8; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #555; margin-left: 8px; }
  .not-generated { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px 16px; border-radius: 6px; color: #9a3412; font-size: 13px; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #6366f1; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; }
  .toc { margin: 20px 0 30px; }
  .toc a { color: #6366f1; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }
  .toc li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
  .ref-material { background: #f8f8f8; border: 1px solid #e5e5e5; border-radius: 6px; padding: 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.7; max-height: 400px; overflow-y: auto; white-space: pre-wrap; }
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

<h1>${course.title}${titleSuffix}</h1>
<div class="meta">
  <span>📚 ${course.subject}</span>
  <span>📊 ${course.level}</span>
  ${isBootcamp ? `<span>🏕️ ${isSingleUnit ? unitLabel : `${course.duration_days}-Day Bootcamp`}</span>` : '<span>📖 Self-Paced</span>'}
</div>
${course.goal ? `<p><strong>Goal:</strong> ${course.goal}</p>` : ''}
`

    // Table of contents
    if (units && units.length > 0) {
      html += `<div class="toc"><h2>Table of Contents</h2><ol>`
      for (const unit of units) {
        const unitLessons = (lessons || []).filter(l => l.unit_id === unit.id)
        html += `<li><a href="#unit-${unit.id}">${unit.title}</a>`
        if (unitLessons.length > 0) {
          html += `<ul>`
          for (const lesson of unitLessons) {
            html += `<li><a href="#lesson-${lesson.id}">${lesson.title}</a>${!lesson.content ? ' <em style="color:#999">(not yet studied)</em>' : ''}</li>`
          }
          html += `</ul>`
        }
        html += `</li>`
      }
      html += `</ol></div><hr>`
    }

    // Content
    for (const unit of (units || [])) {
      html += `<h2 id="unit-${unit.id}">${unit.title}</h2>`
      if (unit.summary) html += `<p style="color:#555">${unit.summary}</p>`

      const unitLessons = (lessons || []).filter(l => l.unit_id === unit.id).sort((a, b) => a.order_index - b.order_index)

      for (const lesson of unitLessons) {
        const mins = lesson.estimated_minutes
        html += `<div class="section">`
        html += `<h3 id="lesson-${lesson.id}">${lesson.title}${mins ? `<span class="time-badge">~${mins} min</span>` : ''}</h3>`
        html += `<div class="objective">${lesson.objective}</div>`

        if (lesson.content) {
          html += `<div class="content">${lesson.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`

          if (lesson.examples) {
            html += `<div style="margin-top:12px"><strong>Examples:</strong><br>${lesson.examples.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`
          }

          if (lesson.key_terms && Array.isArray(lesson.key_terms) && lesson.key_terms.length > 0) {
            html += `<div class="key-terms"><strong>Key Terms:</strong><ul>`
            for (const term of lesson.key_terms) {
              html += `<li>${String(term).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`
            }
            html += `</ul></div>`
          }

          if (lesson.recap) {
            html += `<div class="recap"><strong>Recap:</strong> ${lesson.recap.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
          }
        } else {
          html += `<div class="not-generated">📝 This section hasn't been studied yet. Open it in LessonPilot to generate the full lesson content, then download this guide again.</div>`
        }

        html += `</div>`
      }
      html += `<hr>`
    }

    // Source material appendix (only for full course guide, not per-day)
    if (!isSingleUnit && sourceDocs && sourceDocs.length > 0) {
      const hasText = sourceDocs.some(d => d.raw_text && d.raw_text.length > 100)
      if (hasText) {
        html += `<h2>📎 Reference Material</h2>
<p style="color:#666;font-size:13px">Source material used to build this course.</p>`
        for (const doc of sourceDocs) {
          if (doc.raw_text && doc.raw_text.length > 100) {
            html += `<div class="ref-material">${doc.raw_text.slice(0, 15000).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`
          }
        }
        html += `<hr>`
      }
    }

    html += `<div style="text-align:center;color:#999;font-size:12px;margin-top:40px">
  Generated by LessonPilot · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
</div></body></html>`

    const safeTitle = course.title.replace(/[^a-zA-Z0-9 ]/g, '')
    const fileName = isSingleUnit && units?.[0]
      ? `${safeTitle}-${units[0].title.replace(/[^a-zA-Z0-9 ]/g, '')}-Study-Guide.html`
      : `${safeTitle}-Study-Guide.html`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (e) {
    console.error('Study guide error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
