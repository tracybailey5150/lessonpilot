'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const DriveMode = dynamic(() => import('@/components/DriveMode'), { ssr: false })

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

// ─── Audio Player Hook (OpenAI TTS) ─────────────────────────────────────────
function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [speed, setSpeed] = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

  const speak = useCallback(async (text: string, _rate = 1) => {
    cleanup()
    setIsLoading(true)
    setIsPlaying(false)
    setIsPaused(false)
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'onyx' }),
      })
      if (!res.ok) { setIsLoading(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audio.playbackRate = _rate
      audioRef.current = audio
      audio.onplay = () => { setIsPlaying(true); setIsPaused(false); setIsLoading(false) }
      audio.onended = () => { setIsPlaying(false); setIsPaused(false); cleanup() }
      audio.onerror = () => { setIsPlaying(false); setIsPaused(false); setIsLoading(false); cleanup() }
      await audio.play()
    } catch {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [cleanup])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    cleanup()
    setIsPlaying(false)
    setIsPaused(false)
  }, [cleanup])

  const changeSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    if (audioRef.current) audioRef.current.playbackRate = newSpeed
  }, [])

  return { isPlaying, isPaused, isLoading, speed, speak, pause, resume, stop, changeSpeed, setSpeed }
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

  const audio = useAudioPlayer()
  const [driveModeActive, setDriveModeActive] = useState(false)

  // Q&A Chat
  const [qaOpen, setQaOpen] = useState(false)
  const [qaQuestion, setQaQuestion] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaHistory, setQaHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([])

  const handleAskQuestion = async () => {
    if (!qaQuestion.trim() || qaLoading) return
    const q = qaQuestion.trim()
    setQaHistory(h => [...h, { role: 'user', text: q }])
    setQaQuestion('')
    setQaLoading(true)
    try {
      const res = await fetch('/api/lessons/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, question: q }),
      })
      const data = await res.json()
      setQaHistory(h => [...h, { role: 'ai', text: data.answer || 'Sorry, I couldn\'t find an answer.' }])
    } catch {
      setQaHistory(h => [...h, { role: 'ai', text: 'Something went wrong. Please try again.' }])
    }
    setQaLoading(false)
  }

  // Build the full text to read aloud
  const buildReadAloudText = (l: Lesson) => {
    const keyTermsArray = Array.isArray(l.key_terms)
      ? l.key_terms
      : l.key_terms ? Object.entries(l.key_terms).map(([k, v]) => `${k}: ${v}`) : []

    let text = `${l.title}. `
    if (l.objective) text += `Learning objective: ${l.objective}. `
    if (l.content) text += l.content + ' '
    if (l.examples) text += `Examples: ${l.examples} `
    if (keyTermsArray.length > 0) text += `Key terms: ${keyTermsArray.join('. ')} `
    if (l.recap) text += `Recap: ${l.recap}`
    return text
  }

  const handleListen = () => {
    if (!lesson) return
    if (audio.isPlaying && !audio.isPaused) {
      audio.pause()
    } else if (audio.isPaused) {
      audio.resume()
    } else {
      audio.speak(buildReadAloudText(lesson), audio.speed)
    }
  }

  const handleDriveModeOpen = () => {
    audio.stop()
    setDriveModeActive(true)
  }

  // Stop audio when leaving page
  useEffect(() => { return () => { audio.stop() } }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (userRec) setUserId(userRec.id)

      const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single()

      if (lessonData && !lessonData.content) {
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
    audio.stop()
    await fetch('/api/progress/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, lessonId, courseId, status: 'completed', score: 100 }),
    })
    router.push(`/courses/${courseId}`)
  }

  const handleQuiz = () => { audio.stop(); router.push(`/courses/${courseId}/quiz/${lessonId}`) }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    breadcrumb: { display: 'flex', gap: '8px', alignItems: 'center', color: '#64748B', fontSize: '13px' } as React.CSSProperties,
    main: { maxWidth: '760px', margin: '0 auto', padding: '48px 32px 140px' } as React.CSSProperties,
    badge: { background: 'rgba(99,102,241,0.15)', color: '#6366F1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
    h1: { fontSize: '30px', fontWeight: 800, marginTop: '12px', marginBottom: '8px', lineHeight: 1.3 } as React.CSSProperties,
    objective: { color: '#64748B', fontSize: '15px', marginBottom: '32px', lineHeight: 1.6 } as React.CSSProperties,
    content: { fontSize: '16px', lineHeight: 1.8, color: '#E2E8F0', whiteSpace: 'pre-wrap' as const, marginBottom: '32px' } as React.CSSProperties,
    expandCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' } as React.CSSProperties,
    expandHeader: { padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '14px' } as React.CSSProperties,
    expandBody: { padding: '0 20px 16px', color: '#94A3B8', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const } as React.CSSProperties,
    actionBar: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, background: '#0C1220', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 32px', display: 'flex', flexDirection: 'column' as const, gap: '8px', alignItems: 'center' } as React.CSSProperties,
    btnRow: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' as const } as React.CSSProperties,
    btnGreen: { background: '#16A34A', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnPurple: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', cursor: 'pointer' } as React.CSSProperties,
    btnAudio: (active: boolean) => ({
      background: active ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.08)',
      border: `1px solid ${active ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.2)'}`,
      color: '#FBBF24',
      borderRadius: '8px',
      padding: '11px 22px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
    } as React.CSSProperties),
    audioControls: { display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '8px', padding: '6px 12px' } as React.CSSProperties,
    speedBtn: (active: boolean) => ({
      background: active ? 'rgba(251,191,36,0.25)' : 'transparent',
      border: 'none',
      color: active ? '#FBBF24' : '#94A3B8',
      borderRadius: '4px',
      padding: '3px 8px',
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
    } as React.CSSProperties),
    generating: { textAlign: 'center' as const, padding: '60px 20px' } as React.CSSProperties,
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

  if (!lesson) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748B' }}>Lesson not found</div>
    </div>
  )

  const keyTermsArray = Array.isArray(lesson.key_terms)
    ? lesson.key_terms
    : lesson.key_terms
      ? Object.entries(lesson.key_terms).map(([k, v]) => `${k}: ${v}`)
      : []

  const listenLabel = audio.isLoading ? '⏳ Loading...' : audio.isPlaying && !audio.isPaused ? '⏸ Pause' : audio.isPaused ? '▶ Resume' : '🔊 Listen'

  return (
    <div style={s.page}>
      {driveModeActive && lesson && (
        <DriveMode
          lesson={lesson}
          courseId={courseId}
          onNavigate={(path) => { setDriveModeActive(false); router.push(path) }}
          onClose={() => setDriveModeActive(false)}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }`}</style>

      <header style={s.header}>
        <div style={s.breadcrumb}>
          <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none' }}>🎓</Link>
          <span>/</span>
          <Link href={`/courses/${courseId}`} style={{ color: '#64748B', textDecoration: 'none' }}>Course</Link>
          <span>/</span>
          <span style={{ color: '#F1F5F9' }}>{lesson.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {audio.isPlaying && (
            <span style={{ fontSize: '11px', color: '#FBBF24', animation: 'pulse 1.5s ease-in-out infinite' }}>
              🔊 Playing
            </span>
          )}
          <span style={s.badge}>{lesson.difficulty}</span>
        </div>
      </header>

      <main style={s.main}>
        {/* AI Instructor Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎓</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#A78BFA' }}>LessonPilot AI Instructor</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Teaching · {lesson.difficulty} level</div>
          </div>
        </div>

        <h1 style={s.h1}>{lesson.title}</h1>
        {lesson.objective && <p style={s.objective}>🎯 {lesson.objective}</p>}

        {/* Lesson content presented as AI teaching */}
        {lesson.content ? (
          <div style={{ background: '#0C1220', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px' }}>📖</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lesson</span>
            </div>
            <div style={s.content}>{lesson.content}</div>
          </div>
        ) : (
          <div style={{ color: '#64748B', padding: '40px', textAlign: 'center' }}>No content generated yet.</div>
        )}

        {lesson.examples && (
          <div style={{ ...s.expandCard, borderColor: 'rgba(34,197,94,0.15)' }}>
            <div style={s.expandHeader} onClick={() => setShowExamples(!showExamples)}>
              <span>📌 Real-World Examples</span>
              <span>{showExamples ? '▲' : '▼'}</span>
            </div>
            {showExamples && <div style={s.expandBody}>{lesson.examples}</div>}
          </div>
        )}

        {keyTermsArray.length > 0 && (
          <div style={{ ...s.expandCard, borderColor: 'rgba(251,191,36,0.15)' }}>
            <div style={s.expandHeader} onClick={() => setShowTerms(!showTerms)}>
              <span>📖 Key Terms ({keyTermsArray.length})</span>
              <span>{showTerms ? '▲' : '▼'}</span>
            </div>
            {showTerms && (
              <div style={s.expandBody}>
                {keyTermsArray.map((term, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {typeof term === 'string' ? term : JSON.stringify(term)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {lesson.recap && (
          <div style={{ ...s.expandCard, borderColor: 'rgba(99,102,241,0.15)' }}>
            <div style={s.expandHeader} onClick={() => setShowRecap(!showRecap)}>
              <span>🔁 Lesson Recap</span>
              <span>{showRecap ? '▲' : '▼'}</span>
            </div>
            {showRecap && <div style={s.expandBody}>{lesson.recap}</div>}
          </div>
        )}

        {lessonResources.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: '#F1F5F9' }}>📎 Lesson Resources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lessonResources.map(r => {
                const icons: Record<string, string> = { pdf: '📄', audio: '🎵', video: '🎬', zip: '🗜️', youtube: '▶️', url: '🔗', slides: '🎞️', workbook: '📝', file: '📎' }
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

      {/* ── Q&A Chat Panel ── */}
      {qaOpen && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '16px', width: '380px', maxHeight: '500px',
          background: '#0C1220', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 50,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🎓</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#A78BFA' }}>Ask Your Instructor</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>Answers grounded in your course material</div>
              </div>
            </div>
            <button onClick={() => setQaOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px' }}>
            {qaHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: '13px' }}>
                Ask anything about this lesson. The AI will answer using your course materials.
              </div>
            )}
            {qaHistory.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: msg.role === 'user' ? '#6366F1' : 'rgba(255,255,255,0.05)',
                color: msg.role === 'user' ? '#fff' : '#E2E8F0',
                fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
            ))}
            {qaLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: 'rgba(255,255,255,0.05)', color: '#A78BFA', fontSize: '13px' }}>
                Thinking...
              </div>
            )}
          </div>

          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={qaQuestion}
              onChange={e => setQaQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAskQuestion() }}
              placeholder="Ask a question..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', padding: '10px 12px', color: '#F1F5F9', fontSize: '13px', outline: 'none',
              }}
            />
            <button
              onClick={handleAskQuestion}
              disabled={qaLoading || !qaQuestion.trim()}
              style={{
                background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                opacity: qaLoading || !qaQuestion.trim() ? 0.5 : 1,
              }}
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* Action Bar with Audio Controls */}
      <div style={s.actionBar}>
        {/* Audio speed controls — show when playing */}
        {audio.isPlaying && lesson && (
          <div style={s.audioControls}>
            <span style={{ fontSize: '12px', color: '#94A3B8', marginRight: '4px' }}>Speed:</span>
            {[0.75, 1, 1.25, 1.5, 2].map(sp => (
              <button
                key={sp}
                style={s.speedBtn(audio.speed === sp)}
                onClick={() => { audio.setSpeed(sp); audio.changeSpeed(sp) }}
              >
                {sp}x
              </button>
            ))}
            <button
              onClick={audio.stop}
              style={{ ...s.speedBtn(false), marginLeft: '8px', color: '#EF4444' }}
            >
              ■ Stop
            </button>
          </div>
        )}

        <div style={s.btnRow}>
          <button
            onClick={handleDriveModeOpen}
            style={{ background: '#FBBF24', color: '#000', border: 'none', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
          >
            🚗 Drive Mode
          </button>
          <button onClick={() => setQaOpen(o => !o)} style={{ background: qaOpen ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)', border: `1px solid ${qaOpen ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.2)'}`, color: '#A78BFA', borderRadius: '8px', padding: '11px 22px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
            {qaOpen ? '✕ Close Q&A' : '❓ Ask Instructor'}
          </button>
          <button onClick={handleListen} style={s.btnAudio(audio.isPlaying)}>
            {listenLabel}
          </button>
          <button onClick={handleGotIt} disabled={completing} style={s.btnGreen}>
            {completing ? 'Marking...' : 'I get it ✓'}
          </button>
          <button onClick={handleQuiz} style={s.btnPurple}>Quiz me 🧪</button>
          <Link href={`/courses/${courseId}`} style={{ ...s.btnGhost, textDecoration: 'none', display: 'inline-block' }}>← Back</Link>
        </div>
      </div>
    </div>
  )
}
