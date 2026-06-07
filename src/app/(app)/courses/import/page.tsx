'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ImportCoursePage() {
  const router = useRouter()
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  async function handleImport() {
    setError('')
    setImporting(true)

    try {
      const payload = JSON.parse(jsonInput)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.push('/login'); return }

      payload.userId = session.user.id

      const res = await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok && data.courseId) {
        router.push(`/courses/${data.courseId}`)
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid JSON format')
    }

    setImporting(false)
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
        Paste a JSON payload with full course structure including modules, lessons, learning objectives, key terms, scenarios, knowledge checks, and assignments.
      </p>

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px' }}>Course JSON</label>
        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder="Paste your structured course JSON here..."
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
