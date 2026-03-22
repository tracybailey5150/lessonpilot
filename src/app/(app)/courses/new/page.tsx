'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewCoursePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    subject: '',
    level: 'beginner',
    goal: '',
    rawText: '',
    teachingStyle: 'step-by-step',
    pace: 'normal',
    quizMode: 'after_each_lesson',
  })

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId: session.user.id }),
      })
      const data = await res.json()
      if (data.courseId) {
        router.push(`/courses/${data.courseId}`)
      } else {
        setError(data.error || 'Failed to create course')
        setLoading(false)
      }
    } catch (e) {
      setError(String(e))
      setLoading(false)
    }
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '680px', margin: '0 auto', padding: '60px 32px' } as React.CSSProperties,
    stepRow: { display: 'flex', gap: '8px', marginBottom: '40px', alignItems: 'center' } as React.CSSProperties,
    stepBadge: (active: boolean, done: boolean) => ({
      width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 700,
      background: done ? '#6366F1' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
      color: done || active ? '#6366F1' : '#64748B',
      border: active ? '2px solid #6366F1' : '2px solid transparent',
    } as React.CSSProperties),
    stepLine: { flex: 1, height: '2px', background: 'rgba(255,255,255,0.07)' } as React.CSSProperties,
    title: { fontSize: '28px', fontWeight: 700, marginBottom: '8px' } as React.CSSProperties,
    subtitle: { color: '#64748B', marginBottom: '32px' } as React.CSSProperties,
    label: { display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '20px' },
    select: { width: '100%', background: '#0C1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '20px' },
    textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '20px', resize: 'vertical' as const, minHeight: '200px' },
    btnRow: { display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '8px' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', flex: 1 } as React.CSSProperties,
    btnBack: { background: 'transparent', color: '#64748B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', cursor: 'pointer' } as React.CSSProperties,
    styleOption: (selected: boolean) => ({
      background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
      border: selected ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px', padding: '14px', cursor: 'pointer', marginBottom: '12px',
      color: selected ? '#F1F5F9' : '#64748B',
    } as React.CSSProperties),
    error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' } as React.CSSProperties,
  }

  const teachingStyles = [
    { value: 'step-by-step', label: '🪜 Step-by-Step', desc: 'Break it down piece by piece, building on each concept' },
    { value: 'plain-english', label: '💬 Plain English', desc: 'Simple language, no jargon, real-world examples' },
    { value: 'deep-dive', label: '🔬 Deep Dive', desc: 'Thorough explanations with the why and how' },
    { value: 'exam-prep', label: '📝 Exam Prep', desc: 'Focus on key facts, patterns, and test-taking strategies' },
    { value: 'coach-mode', label: '🏋️ Coach Mode', desc: 'Motivating, challenge-based, push through hard topics' },
  ]

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontSize: '18px', fontWeight: 700 }}>✈️ LessonPilot</Link>
        <Link href="/dashboard" style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}>← Back to Dashboard</Link>
      </header>

      <main style={s.main}>
        {/* Step indicator */}
        <div style={s.stepRow}>
          {[1, 2, 3].map((n, i) => (
            <>
              <div key={`step-${n}`} style={s.stepBadge(step === n, step > n)}>{step > n ? '✓' : n}</div>
              {i < 2 && <div key={`line-${n}`} style={s.stepLine} />}
            </>
          ))}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* Step 1 */}
        {step === 1 && (
          <>
            <h1 style={s.title}>Create a new course</h1>
            <p style={s.subtitle}>Tell us what you want to learn</p>

            <label style={s.label}>Course Name</label>
            <input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. AWS Solutions Architect Prep" style={s.input} />

            <label style={s.label}>Subject / Topic</label>
            <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="e.g. Cloud Computing, Python, Project Management" style={s.input} />

            <label style={s.label}>Level</label>
            <select value={form.level} onChange={e => update('level', e.target.value)} style={s.select}>
              <option value="beginner">Beginner — start from scratch</option>
              <option value="intermediate">Intermediate — I know the basics</option>
              <option value="advanced">Advanced — deep technical knowledge</option>
              <option value="exam-prep">Exam Prep — focused test preparation</option>
            </select>

            <label style={s.label}>What&apos;s your goal?</label>
            <input type="text" value={form.goal} onChange={e => update('goal', e.target.value)} placeholder="e.g. Pass the AWS exam, build a production app, onboard new employees" style={s.input} />

            <div style={s.btnRow}>
              <button onClick={() => { if (form.title) setStep(2) }} disabled={!form.title} style={s.btn}>Next: Add Material →</button>
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <h1 style={s.title}>Add your learning material</h1>
            <p style={s.subtitle}>Paste your text, notes, or study material below</p>

            <label style={s.label}>Paste Text / Notes / Study Material</label>
            <textarea
              value={form.rawText}
              onChange={e => update('rawText', e.target.value)}
              placeholder="Paste your learning material here — lecture notes, documentation, study guides, SOPs, anything you want to be taught from..."
              style={s.textarea}
            />
            <div style={{ color: '#64748B', fontSize: '12px', marginTop: '-16px', marginBottom: '20px' }}>
              {form.rawText.length.toLocaleString()} characters. For best results, aim for 500+ words.
            </div>

            <div style={s.btnRow}>
              <button onClick={() => setStep(1)} style={s.btnBack}>← Back</button>
              <button onClick={() => { if (form.rawText) setStep(3) }} disabled={!form.rawText} style={s.btn}>Next: Choose Style →</button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <h1 style={s.title}>Choose your teaching style</h1>
            <p style={s.subtitle}>How do you learn best?</p>

            <label style={s.label}>Teaching Style</label>
            {teachingStyles.map(ts => (
              <div key={ts.value} style={s.styleOption(form.teachingStyle === ts.value)} onClick={() => update('teachingStyle', ts.value)}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{ts.label}</div>
                <div style={{ fontSize: '13px' }}>{ts.desc}</div>
              </div>
            ))}

            <label style={s.label} style={{ marginTop: '8px' }}>Quiz Frequency</label>
            <select value={form.quizMode} onChange={e => update('quizMode', e.target.value)} style={s.select}>
              <option value="after_each_lesson">After each lesson (recommended)</option>
              <option value="after_each_unit">After each unit</option>
              <option value="on_request">Only when I ask</option>
            </select>

            <div style={s.btnRow}>
              <button onClick={() => setStep(2)} style={s.btnBack}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} style={s.btn}>
                {loading ? '🤖 Generating curriculum...' : '🚀 Build My Curriculum →'}
              </button>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', marginTop: '16px' }}>
                GPT-4o is designing your curriculum. This takes 15–30 seconds...
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
