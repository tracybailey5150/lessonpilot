'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Audio Player ────────────────────────────────────────────────────────────
function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)

  const speak = useCallback((text: string, rate = 1) => {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = rate; utt.pitch = 1; utt.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('google')) || voices.find(v => v.lang === 'en-US') || voices[0]
    if (preferred) utt.voice = preferred
    utt.onstart = () => { setIsPlaying(true); setIsPaused(false) }
    utt.onend = () => { setIsPlaying(false); setIsPaused(false) }
    utt.onpause = () => setIsPaused(true)
    utt.onresume = () => setIsPaused(false)
    utt.onerror = () => { setIsPlaying(false); setIsPaused(false) }
    window.speechSynthesis.speak(utt)
  }, [])

  const pause = useCallback(() => { window.speechSynthesis.pause(); setIsPaused(true) }, [])
  const resume = useCallback(() => { window.speechSynthesis.resume(); setIsPaused(false) }, [])
  const stop = useCallback(() => { window.speechSynthesis.cancel(); setIsPlaying(false); setIsPaused(false) }, [])

  return { isPlaying, isPaused, speed, speak, pause, resume, stop, setSpeed }
}

interface Question {
  id: string
  type: 'multiple_choice' | 'short_answer'
  question: string
  options?: string[]
  correct?: string
}

interface Quiz {
  id: string
  questions: Question[]
  answer_key: Record<string, string>
}

export default function QuizPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const lessonId = params.lessonId as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ score: number; feedback: string[]; passed: boolean } | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const audio = useAudioPlayer()
  useEffect(() => { return () => window.speechSynthesis?.cancel() }, [])

  const readQuestion = useCallback((q: Question | undefined) => {
    if (!q) return
    const text = `Question: ${q.question}. ${q.options ? q.options.join('. ') : ''}`
    audio.speak(text, audio.speed)
  }, [audio])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (userRec) setUserId(userRec.id)

      const { data: quizData } = await supabase.from('quizzes').select('*').eq('lesson_id', lessonId).single()

      if (!quizData) {
        setGenerating(true)
        try {
          const res = await fetch('/api/quizzes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId }),
          })
          const data = await res.json()
          setQuiz(data.quiz)
        } catch {
          console.error('Failed to generate quiz')
        }
        setGenerating(false)
      } else {
        setQuiz(quizData)
      }

      setLoading(false)
    }
    load()
  }, [lessonId, router])

  const handleSubmit = async () => {
    if (!userId || !quiz) return
    const res = await fetch('/api/quizzes/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, userId, answers, courseId }),
    })
    const data = await res.json()
    setResult(data)
    setSubmitted(true)
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '680px', margin: '0 auto', padding: '60px 32px' } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '40px' } as React.CSSProperties,
    progress: { color: '#64748B', fontSize: '13px', marginBottom: '24px' } as React.CSSProperties,
    question: { fontSize: '20px', fontWeight: 700, marginBottom: '28px', lineHeight: 1.4 } as React.CSSProperties,
    option: (selected: boolean) => ({
      background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
      border: selected ? '1px solid #6366F1' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px', padding: '14px 18px', marginBottom: '10px', cursor: 'pointer',
      color: selected ? '#F1F5F9' : '#94A3B8', fontSize: '14px',
    } as React.CSSProperties),
    textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', color: '#F1F5F9', fontSize: '14px', outline: 'none', resize: 'vertical' as const, minHeight: '100px', boxSizing: 'border-box' as const } as React.CSSProperties,
    btnRow: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer' } as React.CSSProperties,
    btnAudio: (active: boolean) => ({ background: active ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.08)', border: `1px solid ${active ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.2)'}`, color: '#FBBF24', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties),
    scoreCircle: { width: '120px', height: '120px', border: '4px solid #6366F1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px', fontWeight: 800 } as React.CSSProperties,
  }

  if (loading || generating) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🤖</div>
        <div style={{ fontWeight: 600 }}>{generating ? 'Generating your quiz...' : 'Loading...'}</div>
        {generating && <div style={{ color: '#64748B', fontSize: '14px', marginTop: '8px' }}>Creating smart questions from lesson content</div>}
      </div>
    </div>
  )

  if (!quiz) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Quiz not available</div></div>

  const questions: Question[] = Array.isArray(quiz.questions) ? quiz.questions : []
  const currentQuestion = questions[currentQ]

  // Results view
  if (submitted && result) {
    const passed = result.passed
    return (
      <div style={s.page}>
        <header style={s.header}>
          <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontWeight: 700 }}>🎓 LessonPilot</Link>
        </header>
        <main style={s.main}>
          <div style={s.card}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ ...s.scoreCircle, borderColor: passed ? '#4ADE80' : '#F87171', color: passed ? '#4ADE80' : '#F87171' }}>
                {result.score}%
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
                {passed ? '🎉 Great job!' : '😅 Keep at it!'}
              </h2>
              <p style={{ color: '#64748B' }}>
                {passed ? 'You passed this lesson. Ready for the next one?' : 'Score below 70%. A review session will help you master this.'}
              </p>
            </div>

            {result.feedback && result.feedback.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontWeight: 600, marginBottom: '12px' }}>Feedback</div>
                {result.feedback.map((f, i) => (
                  <div key={i} style={{ color: '#94A3B8', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{f}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              {passed ? (
                <Link href={`/courses/${courseId}`} style={{ ...s.btn, textDecoration: 'none', display: 'block', textAlign: 'center', flex: 1 }}>
                  Next Lesson →
                </Link>
              ) : (
                <Link href={`/courses/${courseId}/lesson/${lessonId}`} style={{ ...s.btn, background: '#F59E0B', textDecoration: 'none', display: 'block', textAlign: 'center', flex: 1 }}>
                  Review & Retry
                </Link>
              )}
              <Link href={`/courses/${courseId}`} style={{ ...s.btnGhost, textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                Back to Course
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href={`/courses/${courseId}`} style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px' }}>← Course</Link>
          <Link href={`/courses/${courseId}/lesson/${lessonId}`} style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px' }}>← Lesson</Link>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            style={s.btnAudio(audio.isPlaying)}
            onClick={() => {
              if (audio.isPlaying && !audio.isPaused) audio.pause()
              else if (audio.isPaused) audio.resume()
              else readQuestion(currentQuestion)
            }}
          >
            {audio.isPlaying && !audio.isPaused ? '⏸ Pause' : audio.isPaused ? '▶ Resume' : '🔊 Read Question'}
          </button>
          <span style={{ color: '#64748B', fontSize: '13px' }}>Quiz · {questions.length} questions</span>
        </div>
      </header>

      <main style={s.main}>
        <div style={s.card}>
          <div style={s.progress}>
            Question {currentQ + 1} of {questions.length}
            <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '4px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentQ + 1) / questions.length) * 100}%`, background: '#6366F1', height: '100%', borderRadius: '4px' }} />
            </div>
          </div>

          {currentQuestion && (
            <>
              <div style={s.question}>{currentQuestion.question}</div>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div>
                  {currentQuestion.options.map((opt, i) => (
                    <div
                      key={i}
                      style={s.option(answers[currentQuestion.id] === opt)}
                      onClick={() => setAnswers(a => ({ ...a, [currentQuestion.id]: opt }))}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'short_answer' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [currentQuestion.id]: e.target.value }))}
                  placeholder="Type your answer..."
                  style={s.textarea}
                />
              )}

              <div style={s.btnRow}>
                {currentQ > 0 && (
                  <button onClick={() => setCurrentQ(q => q - 1)} style={s.btnGhost}>← Previous</button>
                )}
                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ(q => q + 1)}
                    disabled={!answers[currentQuestion.id]}
                    style={s.btn}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!answers[currentQuestion.id]}
                    style={{ ...s.btn, background: '#16A34A' }}
                  >
                    Submit Quiz ✓
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
