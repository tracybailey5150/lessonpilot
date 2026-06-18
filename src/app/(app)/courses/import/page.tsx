'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ImportCoursePage() {
  const router = useRouter()
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileDrop(files: FileList | File[]) {
    const arr = Array.from(files)
    const jsonFiles = arr.filter(f => f.name.endsWith('.json'))
    const otherFiles = arr.filter(f => !f.name.endsWith('.json'))

    // If a JSON file is dropped, load it into the textarea
    if (jsonFiles.length > 0) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setJsonInput(text)
        setError('')
      }
      reader.readAsText(jsonFiles[0])
    }

    // Attach non-JSON files as resources
    if (otherFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...otherFiles])
    }

    // If multiple JSON files, queue them (load first, note the rest)
    if (jsonFiles.length > 1) {
      setAttachedFiles(prev => [...prev, ...jsonFiles.slice(1)])
    }
  }

  function removeAttached(index: number) {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadResources(courseId: string, token: string) {
    for (const file of attachedFiles) {
      setStatus(`Uploading resource: ${file.name}...`)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('courseId', courseId)

      const uploadRes = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (!uploadRes.ok) {
        setStatus(`Warning: Failed to upload ${file.name}`)
        continue
      }

      let uploadData
      try {
        uploadData = await uploadRes.json()
      } catch {
        setStatus(`Warning: Bad response for ${file.name}`)
        continue
      }

      const { url, path, size, mimeType } = uploadData

      // Detect type from extension
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      const typeMap: Record<string, string> = {
        pdf: 'pdf', md: 'document', txt: 'document', doc: 'document', docx: 'document',
        json: 'data', csv: 'data', xls: 'spreadsheet', xlsx: 'spreadsheet',
        mp4: 'video', webm: 'video', mp3: 'audio', wav: 'audio',
        png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image',
      }
      const type = typeMap[ext] || 'file'

      await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          type,
          name: file.name,
          url,
          filePath: path,
          fileSize: size,
          mimeType,
        }),
      })
    }
  }

  async function handleImport() {
    setError('')
    setImporting(true)
    setStatus('Parsing JSON...')

    try {
      let payload
      try {
        payload = JSON.parse(jsonInput)
      } catch {
        setError('Invalid JSON. Make sure you paste or upload a .json file — not a .md or .pdf. Use the file picker to attach non-JSON files as resources.')
        setImporting(false)
        setStatus('')
        return
      }

      // Validate required fields before sending
      if (!payload.title) {
        setError('JSON is missing a "title" field. This file may not be a course import file.')
        setImporting(false); setStatus(''); return
      }
      if (!payload.lessons || !Array.isArray(payload.lessons) || payload.lessons.length === 0) {
        setError(`JSON has no "lessons" array. This looks like a "${payload.type || 'data'}" file, not a course import. Use the course import format with modules and lessons.`)
        setImporting(false); setStatus(''); return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }

      payload.userId = session.user.id
      setStatus('Creating course...')

      const res = await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.courseId) {
        // Upload attached resources to the new course
        if (attachedFiles.length > 0) {
          setStatus(`Uploading ${attachedFiles.length} resource file(s)...`)
          await uploadResources(data.courseId, session.access_token)
        }
        setStatus('Done! Redirecting...')
        router.push(`/courses/${data.courseId}`)
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    }

    setImporting(false)
    setStatus('')
  }

  const exampleFormat = `{
  "title": "Course Title",
  "subject": "Subject Area",
  "level": "intermediate",
  "goal": "What learners will achieve",
  "teachingStyle": "step-by-step",
  "courseFormat": "self-paced",
  "modules": [
    { "title": "Module 1 — Topic", "summary": "What this module covers" }
  ],
  "lessons": [
    {
      "title": "Lesson Title",
      "module": "Module 1 — Topic",
      "lessonNumber": 1,
      "estimatedMinutes": 60,
      "difficulty": "intermediate",
      "domainAlignment": "Creating AV Solutions",
      "overview": "Lesson overview...",
      "learningObjectives": ["Objective 1", "Objective 2"],
      "keyTerms": [{ "term": "Term", "definition": "Definition" }],
      "content": "Full teaching content...",
      "scenarios": [{
        "situation": "Description",
        "notice": "What to notice",
        "nextStep": "Best action",
        "whyMatters": "Why"
      }],
      "workedExamples": [{
        "given": "Info",
        "asked": "Question",
        "solution": "Steps",
        "answer": "Result",
        "wrongApproach": "Common mistake"
      }],
      "examRelevance": "How this connects to the exam",
      "knowledgeCheck": [{
        "question": "Question text",
        "type": "multiple-choice",
        "options": ["A", "B", "C", "D"],
        "answer": "A",
        "explanation": "Why A is correct",
        "domain": "Domain name"
      }],
      "practicalAssignment": "Assignment description",
      "studyNotes": {
        "memorize": ["Item 1"],
        "understand": ["Concept 1"],
        "practice": ["Skill 1"],
        "examTraps": ["Trap 1"],
        "fieldTip": "Pro tip"
      },
      "summary": "Key takeaways"
    }
  ]
}`

  return (
    <div style={{ padding: '40px 32px', maxWidth: '900px', margin: '0 auto', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px', color: '#F1F5F9' }}>Import Structured Course</h1>
      <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '32px' }}>
        Upload or paste a JSON course payload. Attach .md, .pdf, and other files as course resources.
      </p>

      {/* File upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFileDrop(e.dataTransfer.files) }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed rgba(99,102,241,0.4)', borderRadius: '12px', padding: '28px',
          textAlign: 'center', marginBottom: '24px', cursor: 'pointer',
          background: 'rgba(99,102,241,0.04)', transition: 'border-color 0.2s',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px' }}>
          Drop files here or click to browse
        </div>
        <div style={{ fontSize: '12px', color: '#64748B' }}>
          .json files load as course data &bull; .md, .pdf, and other files attach as resources
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json,.md,.pdf,.txt,.doc,.docx,.csv,.xls,.xlsx,.mp3,.mp4,.png,.jpg,.jpeg,.webp"
          onChange={e => { if (e.target.files) handleFileDrop(e.target.files); e.target.value = '' }}
          style={{ display: 'none' }}
        />
      </div>

      {/* Attached resource files */}
      {attachedFiles.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px' }}>
            Attached Resources ({attachedFiles.length})
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {attachedFiles.map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0C1220', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '10px 14px',
              }}>
                <span style={{ color: '#F1F5F9', fontSize: '13px' }}>
                  {f.name} <span style={{ color: '#64748B' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                </span>
                <button
                  onClick={() => removeAttached(i)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px' }}>Course JSON</label>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder="Paste your structured course JSON here, or drop a .json file above..."
          style={{
            width: '100%', height: '400px', background: '#0C1220', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', padding: '16px', color: '#F1F5F9', fontSize: '13px',
            fontFamily: 'monospace', resize: 'vertical',
          }}
        />
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#EF4444', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {status && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#818CF8', fontSize: '13px' }}>
          {status}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleImport}
          disabled={importing || !jsonInput.trim()}
          style={{
            background: importing ? '#4B5563' : '#6366F1', color: '#fff', border: 'none',
            borderRadius: '8px', padding: '14px 28px', fontSize: '15px', fontWeight: 700,
            cursor: importing ? 'not-allowed' : 'pointer',
          }}
        >
          {importing ? 'Importing...' : 'Import Course'}
        </button>
        <button
          onClick={() => router.push('/courses')}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', borderRadius: '8px', padding: '14px 20px', fontSize: '14px', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>

      <details style={{ marginTop: '40px' }}>
        <summary style={{ color: '#64748B', fontSize: '13px', cursor: 'pointer', marginBottom: '12px' }}>View expected JSON format</summary>
        <pre style={{ background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', color: '#94A3B8', fontSize: '12px', overflow: 'auto', maxHeight: '500px' }}>
          {exampleFormat}
        </pre>
      </details>
    </div>
  )
}
