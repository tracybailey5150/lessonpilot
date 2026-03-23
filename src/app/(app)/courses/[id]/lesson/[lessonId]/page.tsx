'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Resource {
  id: string
  type: string
  name: string
  url: string | null
  file_size: number | null
}

interface Lesson {
  id: string
  title: string
  objective: string
  content: string
  examples: string
  key_terms: string[] | Record<string, string>
  recap: string
  difficulty: string
  course_id: string
  unit_id: string
}

export default function LessonPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const lessonId = params.lessonId as string

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showExamples, setShowExamples] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [lessonResources, setLessonResources] = useState<Resource[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (userRec) setUserId(userRec.id)

      const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single()

      if (lessonData && !lessonData.content) {
        // Generate lesson content
        setGenerating(true)
        try {
          const res = await fetch('/api/lessons/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, userId: userRec?.id }),
          })
          const generated = await res.json()
          setLesson(generated.lesson || lessonData)
        } catch {
          setLesson(lessonData)
        }
        setGenerating(false)
      } else {
        setLesson(lessonData)
      }

      // Fetch lesson resources
      if (userRec) {
        const token = session.access_token
        const resResp = await fetch(`/api/resources?courseId=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resResp.ok) {
          const resData = await resResp.json()
          const filtered = (resData.resources || []).filter((r: Resource & { lesson_id?: string }) => r.lesson_id === lessonId)
          setLessonResources(filtered)
        }
      }

      // Mark as in_progress
      if (userRec) {
        await fetch('/api/progress/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userRec.id, lessonId, courseId, status: 'in_progress' }),
        })
      }

      setLoading(false)
    }
    load()
  }, [lessonId, courseId, router])

  const handleGotIt = async () => {
    if (!userId) return
    setCompleting(true)
    await fetch('/api/progress/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, lessonId, courseId, status: 'completed', score: 100 }),
    })
    // Go to course page
    router.push(`/courses/${courseId}`)
  }

  const handleQuiz = () => router.push(`/courses/${courseId}/quiz/${lessonId}`)

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    breadcrumb: { display: 'flex', gap: '8px', alignItems: 'center', color: '#64748B', fontSize: '13px' } as React.CSSProperties,
    main: { maxWidth: '760px', margin: '0 auto', padding: '48px 32px 120px' } as React.CSSProperties,
    badge: { background: 'rgba(99,102,241,0.15)', color: '#6366F1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
    h1: { fontSize: '30px', fontWeight: 800, marginTop: '12px', marginBottom: '8px', lineHeight: 1.3 } as React.CSSProperties,
    objective: { color: '#64748B', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6 } as React.CSSProperties,
    content: { fontSize: '16px', lineHeight: 1.8, color: '#E2E8F0', whiteSpace: 'pre-wrap' as const, marginBottom: '32px' } as React.CSSProperties,
    expandCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' } as React.CSSProperties,
    expandHeader: { padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '14px' } as React.CSSProperties,
    expandBody: { padding: '0 20px 16px', color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const } as React.CSSProperties,
    actionBar: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#0C1220', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const } as React.CSSProperties,
    btnGreen: { background: '#16A34A', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnPurple: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer' } as React.CSSProperties,
    generating: { textAlign: 'center' as const, padding: '60px 20px' } as React.CSSProperties,
    spinner: { width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366F1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' } as React.CSSProperties,
  }

  if (loading || generating) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={s.generating}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🤖</div>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          {generating ? 'Generating your lesson...' : 'Loading...'}
        </div>
        <div style={{ color: '#64748B', fontSize: '14px' }}>
          {generating ? 'AI is preparing a personalized lesson just for you' : ''}
        </div>
      </div>
    </div>
  )

  if (!lesson) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Lesson not found</div></div>

  const keyTermsArray = Array.isArray(lesson.key_terms)
    ? lesson.key_terms
    : lesson.key_terms
      ? Object.entries(lesson.key_terms).map(([k, v]) => `${k}: ${v}`)
      : []

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={s.header}>
        <div style={s.breadcrumb}>
          <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>🎓</Link>
          <span>/</span>
          <Link href={`/courses/${courseId}`} style={{ color: '#64748B', textDecoration: 'none' }}>Course</Link>
          <span>/</span>
          <span style={{ color: '#F1F5F9' }}>{lesson.title}</span>
        </div>
        <span style={s.badge}>{lesson.difficulty}</span>
      </header>

      <main style={s.main}>
        <h1 style={s.h1}>{lesson.title}</h1>
        {lesson.objective && <p style={s.objective}>🎯 {lesson.objective}</p>}

        {lesson.content ? (
          <div style={s.content}>{lesson.content}</div>
        ) : (
          <div style={{ color: '#64748B', padding: '40px', textAlign: 'center' }}>No content generated yet.</div>
        )}

        {/* Expandable sections */}
        {lesson.examples && (
          <div style={s.expandCard}>
            <div style={s.expandHeader} onClick={() => setShowExamples(!showExamples)}>
              <span>📌 Examples</span>
              <span>{showExamples ? '▲' : '▼'}</span>
            </div>
            {showExamples && <div style={s.expandBody}>{lesson.examples}</div>}
          </div>
        )}

        {keyTermsArray.length > 0 && (
          <div style={s.expandCard}>
            <div style={s.expandHeader} onClick={() => setShowTerms(!showTerms)}>
              <span>📖 Key Terms ({keyTermsArray.length})</span>
              <span>{showTerms ? '▲' : '▼'}</span>
            </div>
            {showTerms && (
              <div style={s.expandBody}>
                {keyTermsArray.map((term, i) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{typeof term === 'string' ? term : JSON.stringify(term)}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {lesson.recap && (
          <div style={s.expandCard}>
            <div style={s.expandHeader} onClick={() => setShowRecap(!showRecap)}>
              <span>🔁 Lesson Recap</span>
              <span>{showRecap ? '▲' : '▼'}</span>
            </div>
            {showRecap && <div style={s.expandBody}>{lesson.recap}</div>}
          </div>
        )}

        {/* Lesson Resources widget */}
        {lessonResources.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#F1F5F9' }}>📎 Lesson Resources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lessonResources.map(r => {
                const icons: Record<string, string> = { pdf: '📄', audio: '🎵', video: '🎬', zip: '🗜️', youtube: '▶️', url: '🔗', file: '📎' }
                const icon = icons[r.type] || '📎'
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
                    <span style={{ fontSize: '13px', color: '#E2E8F0', flex: 1 }}>{r.name}</span>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', fontSize: '12px', textDecoration: 'none', flexShrink: 0 }}>
                        {r.type === 'youtube' ? '▶ Watch' : '→ Open'}
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      <div style={s.actionBar}>
        <button onClick={handleGotIt} disabled={completing} style={s.btnGreen}>
          {completing ? 'Marking...' : 'I get it ✓'}
        </button>
        <button onClick={handleQuiz} style={s.btnPurple}>Quiz me 🧪</button>
        <button onClick={() => setShowExamples(true)} style={s.btnGhost}>Show example</button>
        <Link href={`/courses/${courseId}`} style={{ ...s.btnGhost, textDecoration: 'none', display: 'inline-block' }}>← Back to course</Link>
      </div>
    </div>
  )
}
