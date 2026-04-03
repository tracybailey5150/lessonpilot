'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import VoiceSelector, { DEFAULT_VOICE_ID } from '@/components/VoiceSelector'

const FREE_COURSE_LIMIT = 3
const ADMIN_EMAILS = ['tracybailey5150@icloud.com']

interface ResourceItem {
  id: string
  title: string
  url?: string
  type: string
  description?: string
  text?: string
  selected: boolean
}

export default function NewCoursePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gateLoading, setGateLoading] = useState(true)
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [isPaid, setIsPaid] = useState(false)
  const [resourceTab, setResourceTab] = useState<'upload' | 'url' | 'ai'>('ai')
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [researchLoading, setResearchLoading] = useState(false)
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    subject: '',
    level: 'intermediate',
    goal: '',
    teachingStyle: 'step-by-step',
    quizMode: 'after_each_lesson',
    voiceId: DEFAULT_VOICE_ID,
    courseFormat: 'self-paced',
    durationDays: '3',
    sectionsPerDay: '4',
  })

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  useEffect(() => {
    async function checkGate() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: userRec } = await supabase.from('users').select('id, subscription_status').eq('supabase_auth_id', session.user.id).single()
      if (!userRec) { setGateLoading(false); return }
      const isAdmin = ADMIN_EMAILS.includes(session.user.email ?? '')
      const paid = isAdmin || ['active', 'trialing'].includes(userRec.subscription_status ?? '')
      setIsPaid(paid)
      if (!paid) {
        const { count } = await supabase.from('courses').select('id', { count: 'exact', head: true }).eq('user_id', userRec.id)
        setCourseCount(count ?? 0)
      }
      setGateLoading(false)
    }
    checkGate()
  }, [router])

  const selectedResources = resources.filter(r => r.selected)
  const combinedText = selectedResources.map(r => r.text || '').filter(Boolean).join('\n\n')

  const addResource = (r: Omit<ResourceItem, 'id' | 'selected'>) => {
    setResources(prev => [...prev, { ...r, id: Math.random().toString(36).slice(2), selected: true }])
  }

  const toggleResource = (id: string) => setResources(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  const removeResource = (id: string) => setResources(prev => prev.filter(r => r.id !== id))

  const handleAiResearch = async () => {
    if (!form.subject && !form.title) return
    setResearchLoading(true)
    setError('')
    try {
      const res = await fetch('/api/resources/ai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: form.title || form.subject, subject: form.subject, level: form.level }),
      })
      const data = await res.json()
      if (data.resources) {
        data.resources.forEach((r: { title: string; url?: string; type: string; description?: string }) => {
          addResource({ title: r.title, url: r.url, type: r.type, description: r.description, text: '' })
        })
      }
      if (data.seedText) {
        addResource({ title: `AI Knowledge Base: ${form.title || form.subject}`, type: 'knowledge-base', text: data.seedText, description: 'AI-generated comprehensive overview' })
      }
    } catch (e) {
      setError(String(e))
    }
    setResearchLoading(false)
  }

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) return
    setFetchingUrl(true)
    setError('')
    try {
      const res = await fetch('/api/resources/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setFetchingUrl(false); return }
      addResource({ title: data.title, url: data.url, type: data.type || 'article', text: data.text, description: `Fetched from ${data.url}` })
      setUrlInput('')
    } catch (e) {
      setError(String(e))
    }
    setFetchingUrl(false)
  }

  const handleFileUpload = async (file: File) => {
    setFileLoading(true)
    setError('')
    try {
      const fileName = file.name.toLowerCase()
      let text = ''
      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsText(file)
        })
      } else {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/parse-document', { method: 'POST', body: fd })
        const data = await res.json()
        text = data.text || ''
      }
      addResource({ title: file.name, type: 'file', text, description: `Uploaded file (${(file.size / 1024).toFixed(0)} KB)` })
    } catch (e) {
      setError(String(e))
    }
    setFileLoading(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const rawText = combinedText || `Course on ${form.title || form.subject}`
      const res = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rawText, userId: session.user.id }),
      })
      const data = await res.json()
      if (data.courseId) {
        // Fire-and-forget: start pre-generating all lesson content in background
        fetch('/api/courses/pregenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId: data.courseId }),
        }).catch(() => {}) // silent — lessons will generate on-demand as fallback
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

  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: ff, color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '720px', margin: '0 auto', padding: '40px 24px 80px' } as React.CSSProperties,
    stepRow: { display: 'flex', gap: '6px', marginBottom: '36px', alignItems: 'center' } as React.CSSProperties,
    stepBadge: (active: boolean, done: boolean) => ({
      width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: 700, flexShrink: 0,
      background: done ? '#6366F1' : active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
      color: done || active ? '#6366F1' : '#64748B',
      border: active ? '2px solid #6366F1' : '2px solid transparent',
    } as React.CSSProperties),
    stepLabel: (active: boolean) => ({ fontSize: '11px', color: active ? '#F1F5F9' : '#475569', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' as const }),
    stepLine: { flex: 1, height: '2px', background: 'rgba(255,255,255,0.07)', marginBottom: '16px' } as React.CSSProperties,
    title: { fontSize: '26px', fontWeight: 800, marginBottom: '6px' } as React.CSSProperties,
    subtitle: { color: '#64748B', marginBottom: '28px', fontSize: '14px' } as React.CSSProperties,
    label: { display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '11px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '18px' },
    select: { width: '100%', background: '#0C1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '11px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '18px' },
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', flex: 1 } as React.CSSProperties,
    btnBack: { background: 'transparent', color: '#64748B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', cursor: 'pointer' } as React.CSSProperties,
    btnRow: { display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '24px' } as React.CSSProperties,
    error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' } as React.CSSProperties,
    tab: (active: boolean) => ({ padding: '8px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: active ? '#6366F1' : 'transparent', color: active ? '#fff' : '#64748B', border: 'none' } as React.CSSProperties),
    tabBar: { display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', marginBottom: '20px' } as React.CSSProperties,
    resCard: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '8px' } as React.CSSProperties,
    styleOption: (selected: boolean) => ({
      background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
      border: selected ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px', padding: '13px 16px', cursor: 'pointer', marginBottom: '10px',
      color: selected ? '#F1F5F9' : '#64748B',
    } as React.CSSProperties),
  }

  const STEPS = ['Course Info', 'Resources', 'Style & Voice', 'Build']

  if (gateLoading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Loading...</div></div>

  if (!isPaid && courseCount !== null && courseCount >= FREE_COURSE_LIMIT) {
    return (
      <div style={s.page}>
        <header style={s.header}><Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontWeight: 700 }}>🎓 LessonPilot</Link></header>
        <main style={{ ...s.main, textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '24px' }}>🔒</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Free Plan Limit Reached</h1>
          <p style={{ color: '#64748B', marginBottom: '32px' }}>You&apos;ve used all {FREE_COURSE_LIMIT} free courses. Upgrade to Pro for unlimited courses.</p>
          <Link href="/settings" style={{ background: '#6366F1', color: '#fff', padding: '14px 32px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>Upgrade to Pro →</Link>
        </main>
      </div>
    )
  }

  const typeIcon = (type: string) => (({ 'youtube': '▶️', 'article': '📄', 'file': '📁', 'book': '📚', 'course': '🎓', 'paper': '📑', 'knowledge-base': '🧠', 'website': '🌐', 'video': '▶️' } as Record<string,string>)[type] || '🔗')

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontSize: '16px', fontWeight: 700 }}>🎓 LessonPilot</Link>
        <Link href="/dashboard" style={{ color: '#64748B', fontSize: '13px', textDecoration: 'none' }}>← Dashboard</Link>
      </header>

      <main style={s.main}>
        {!isPaid && courseCount !== null && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#FCD34D' }}>Free plan: {courseCount}/{FREE_COURSE_LIMIT} courses used</span>
            <Link href="/settings" style={{ fontSize: '12px', color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>Upgrade →</Link>
          </div>
        )}

        {/* Step indicators */}
        <div style={s.stepRow}>
          {STEPS.map((label, i) => {
            const n = i + 1
            return (
              <><div key={`s${n}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={s.stepBadge(step === n, step > n)}>{step > n ? '✓' : n}</div>
                <span style={s.stepLabel(step === n)}>{label}</span>
              </div>{i < STEPS.length - 1 && <div key={`l${n}`} style={s.stepLine} />}</>
            )
          })}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {step === 1 && (
          <>
            <h1 style={s.title}>Create a new course</h1>
            <p style={s.subtitle}>What do you want to learn?</p>
            <label style={s.label}>Course Title</label>
            <input type="text" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. AI Business Strategy" style={s.input} />
            <label style={s.label}>Subject / Topic</label>
            <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)} placeholder="e.g. Artificial Intelligence, Leadership, Marketing" style={s.input} />
            <label style={s.label}>Level</label>
            <select value={form.level} onChange={e => update('level', e.target.value)} style={s.select}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="executive">Executive</option>
            </select>
            <label style={s.label}>Learning Goal</label>
            <input type="text" value={form.goal} onChange={e => update('goal', e.target.value)} placeholder="e.g. Understand how to implement AI in my business" style={s.input} />

            <label style={s.label}>Course Format</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              {[
                { value: 'self-paced', label: '📚 Self-Paced', desc: 'Learn at your own speed' },
                { value: 'bootcamp', label: '🏕️ Multi-Day Bootcamp', desc: 'Structured daily sessions' },
              ].map(f => (
                <div key={f.value} onClick={() => update('courseFormat', f.value)} style={{
                  flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                  background: form.courseFormat === f.value ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                  border: form.courseFormat === f.value ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.07)',
                  color: form.courseFormat === f.value ? '#F1F5F9' : '#64748B',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{f.label}</div>
                  <div style={{ fontSize: '12px' }}>{f.desc}</div>
                </div>
              ))}
            </div>

            {form.courseFormat === 'bootcamp' && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Number of Days</label>
                  <select value={form.durationDays} onChange={e => update('durationDays', e.target.value)} style={s.select}>
                    {[1, 2, 3, 4, 5, 7, 10, 14].map(d => (
                      <option key={d} value={String(d)}>{d} day{d > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>Sections per Day</label>
                  <select value={form.sectionsPerDay} onChange={e => update('sectionsPerDay', e.target.value)} style={s.select}>
                    {[2, 3, 4, 5, 6].map(s => (
                      <option key={s} value={String(s)}>{s} sections</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={s.btnRow}>
              <button onClick={() => { if (form.title) setStep(2) }} disabled={!form.title} style={s.btn}>Next: Gather Resources →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={s.title}>Gather your resources</h1>
            <p style={s.subtitle}>Add content that powers your course. AI builds lessons from what you provide.</p>
            <div style={s.tabBar}>
              <button style={s.tab(resourceTab === 'ai')} onClick={() => setResourceTab('ai')}>🤖 AI Research</button>
              <button style={s.tab(resourceTab === 'url')} onClick={() => setResourceTab('url')}>🔗 Add URL</button>
              <button style={s.tab(resourceTab === 'upload')} onClick={() => setResourceTab('upload')}>📁 Upload</button>
            </div>

            {resourceTab === 'ai' && (
              <div>
                <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '16px' }}>
                  AI will find curated resources and build a comprehensive knowledge base for <strong style={{ color: '#F1F5F9' }}>{form.title || form.subject}</strong>.
                </p>
                <button onClick={handleAiResearch} disabled={researchLoading || (!form.title && !form.subject)} style={{ ...s.btn, background: researchLoading ? 'rgba(99,102,241,0.4)' : '#6366F1' }}>
                  {researchLoading ? '🔍 Researching...' : '🔍 Find Resources with AI'}
                </button>
                {researchLoading && <p style={{ color: '#64748B', fontSize: '13px', marginTop: '10px' }}>Searching and building knowledge base — ~15 seconds...</p>}
              </div>
            )}

            {resourceTab === 'url' && (
              <div>
                <label style={s.label}>Paste a URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleFetchUrl() }} placeholder="https://..." style={{ ...s.input, marginBottom: 0, flex: 1 }} />
                  <button onClick={handleFetchUrl} disabled={fetchingUrl || !urlInput} style={{ ...s.btn, flex: 'none', padding: '11px 20px' }}>{fetchingUrl ? '...' : 'Fetch'}</button>
                </div>
                <p style={{ color: '#475569', fontSize: '12px', marginTop: '8px' }}>Works with articles, YouTube, docs, any webpage.</p>
              </div>
            )}

            {resourceTab === 'upload' && (
              <div>
                <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '32px 20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>☁️</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>Drop files or click to upload</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>PDF, DOCX, TXT, MD</div>
                  {fileLoading && <div style={{ color: '#6366F1', marginTop: '8px', fontSize: '13px' }}>Parsing...</div>}
                </div>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.docx,.txt,.md" onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }} />
              </div>
            )}

            {resources.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>📚 Resource Pool — {selectedResources.length} selected</div>
                {resources.map(r => (
                  <div key={r.id} style={s.resCard}>
                    <input type="checkbox" checked={r.selected} onChange={() => toggleResource(r.id)} style={{ marginTop: '2px', flexShrink: 0, accentColor: '#6366F1' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: r.selected ? '#F1F5F9' : '#64748B', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span>{typeIcon(r.type)}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      </div>
                      {r.description && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{r.description}</div>}
                      {r.text && <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>{r.text.length.toLocaleString()} chars</div>}
                    </div>
                    <button onClick={() => removeResource(r.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </div>
                ))}
                {combinedText.length > 0 && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>Knowledge base: {combinedText.length.toLocaleString()} characters</div>}
              </div>
            )}

            <div style={s.btnRow}>
              <button onClick={() => setStep(1)} style={s.btnBack}>← Back</button>
              <button onClick={() => setStep(3)} style={s.btn}>Next: Style & Voice →</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={s.title}>Teaching style & voice</h1>
            <p style={s.subtitle}>How do you want to learn?</p>
            <label style={s.label}>Teaching Style</label>
            {[
              { value: 'step-by-step', label: '🪜 Step-by-Step', desc: 'Build on each concept progressively' },
              { value: 'plain-english', label: '💬 Plain English', desc: 'Simple language, real examples, no jargon' },
              { value: 'deep-dive', label: '🔬 Deep Dive', desc: 'Thorough with the why and how' },
              { value: 'executive', label: '🎓 Executive', desc: 'MIT-level rigor, strategic frameworks, case studies' },
              { value: 'coach-mode', label: '🏋️ Coach Mode', desc: 'Motivating, challenge-based' },
            ].map(ts => (
              <div key={ts.value} style={s.styleOption(form.teachingStyle === ts.value)} onClick={() => update('teachingStyle', ts.value)}>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>{ts.label}</div>
                <div style={{ fontSize: '13px' }}>{ts.desc}</div>
              </div>
            ))}
            <label style={{ ...s.label, marginTop: '16px' }}>Quiz Frequency</label>
            <select value={form.quizMode} onChange={e => update('quizMode', e.target.value)} style={s.select}>
              <option value="after_each_lesson">After each lesson (recommended)</option>
              <option value="after_each_unit">After each unit</option>
              <option value="on_request">Only when I ask</option>
            </select>
            <div style={{ marginTop: '8px', marginBottom: '24px' }}>
              <VoiceSelector selectedVoiceId={form.voiceId} onSelect={voiceId => update('voiceId', voiceId)} />
            </div>
            <div style={s.btnRow}>
              <button onClick={() => setStep(2)} style={s.btnBack}>← Back</button>
              <button onClick={() => setStep(4)} style={s.btn}>Review & Build →</button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 style={s.title}>Ready to build</h1>
            <p style={s.subtitle}>Review your course setup</p>
            <div style={{ background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[['Course', form.title], ['Subject', form.subject || '—'], ['Level', form.level], ['Format', form.courseFormat === 'bootcamp' ? `${form.durationDays}-day bootcamp · ${form.sectionsPerDay} sections/day` : 'Self-paced'], ['Style', form.teachingStyle], ['Resources', `${selectedResources.length} items`], ['Knowledge Base', `${combinedText.length.toLocaleString()} chars`]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div><div style={{ fontSize: '14px', fontWeight: 600 }}>{v}</div></div>
                ))}
              </div>
            </div>
            <div style={s.btnRow}>
              <button onClick={() => setStep(3)} style={s.btnBack}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} style={{ ...s.btn, background: loading ? 'rgba(99,102,241,0.4)' : '#6366F1' }}>
                {loading ? '🤖 Building curriculum...' : '🚀 Build My Curriculum →'}
              </button>
            </div>
            {loading && <p style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', marginTop: '12px' }}>AI is designing your curriculum from your resources. 15–30 seconds...</p>}
          </>
        )}
      </main>
    </div>
  )
}
