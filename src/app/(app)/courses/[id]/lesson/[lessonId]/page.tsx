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

// ─── Audio Player Hook ───────────────────────────────────────────────────────
function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const speak = useCallback((text: string, rate = 1) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = rate
    utt.pitch = 1
    utt.volume = 1
    // Prefer a clear English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('google')) ||
                      voices.find(v => v.lang === 'en-US') ||
                      voices[0]
    if (preferred) utt.voice = preferred
    utt.onstart = () => { setIsPlaying(true); setIsPaused(false) }
    utt.onend = () => { setIsPlaying(false); setIsPaused(false) }
    utt.onpause = () => setIsPaused(true)
    utt.onresume = () => setIsPaused(false)
    utt.onerror = () => { setIsPlaying(false); setIsPaused(false) }
    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [])

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }, [])

  const changeSpeed = useCallback((newSpeed: number, text: string) => {
    setSpeed(newSpeed)
    if (isPlaying) speak(text, newSpeed)
  }, [isPlaying, speak])

  return { isPlaying, isPaused, speed, speak, pause, resume, stop, changeSpeed, setSpeed }
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
  useEffect(() => { return () => window.speechSynthesis?.cancel() }, [])

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

  const listenLabel = audio.isPlaying && !audio.isPaused ? '⏸ Pause' : audio.isPaused ? '▶ Resume' : '🔊 Listen'

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
        <h1 style={s.h1}>{lesson.title}</h1>
        {lesson.objective && <p style={s.objective}>🎯 {lesson.objective}</p>}

        {lesson.content ? (
          <div style={s.content}>{lesson.content}</div>
        ) : (
          <div style={{ color: '#64748B', padding: '40px', textAlign: 'center' }}>No content generated yet.</div>
        )}

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
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {typeof term === 'string' ? term : JSON.stringify(term)}
                  </div>
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

        {lessonResources.length > 0 && (
          <div style={{ marginTop: '32px' }}>
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
                onClick={() => { audio.setSpeed(sp); audio.stop(); audio.speak(buildReadAloudText(lesson), sp) }}
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
