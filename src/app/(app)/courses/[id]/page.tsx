'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  title: string
  subject: string
  level: string
  goal: string
  teaching_style: string
  course_format?: string
  duration_days?: number
  sections_per_day?: number
}

interface Unit {
  id: string
  title: string
  summary: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  objective: string
  difficulty: string
  order_index: number
  status?: string
  estimated_minutes?: number
}

export default function CoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [progress, setProgress] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, number>>({})
  const [generatingCount, setGeneratingCount] = useState<{ ready: number; total: number } | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (userRec) setUserId(userRec.id)

      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single()
      setCourse(courseData)

      const { data: unitsData } = await supabase.from('curriculum_units').select('*').eq('course_id', courseId).order('order_index')
      const { data: lessonsData } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index')

      const unitsWithLessons = (unitsData ?? []).map(unit => ({
        ...unit,
        lessons: (lessonsData ?? []).filter(l => l.unit_id === unit.id),
      }))
      setUnits(unitsWithLessons)

      if (userRec) {
        const { data: progressData } = await supabase.from('progress').select('lesson_id, status, score').eq('user_id', userRec.id).eq('course_id', courseId)
        const progressMap: Record<string, string> = {}
        const scoresMap: Record<string, number> = {}
        for (const p of progressData ?? []) {
          progressMap[p.lesson_id] = p.status
          if (p.score != null) scoresMap[p.lesson_id] = p.score
        }
        setProgress(progressMap)
        setScores(scoresMap)
      }

      setLoading(false)
    }
    load()
  }, [courseId, router])

  // Poll for lesson generation progress
  useEffect(() => {
    if (!courseId || loading) return
    let cancelled = false

    async function checkGeneration() {
      const { data: allLessons } = await supabase.from('lessons').select('id, content').eq('course_id', courseId)
      if (cancelled || !allLessons) return
      const total = allLessons.length
      const ready = allLessons.filter(l => l.content).length
      if (ready < total) {
        setGeneratingCount({ ready, total })
        setTimeout(checkGeneration, 5000) // poll every 5s
      } else {
        setGeneratingCount(null)
      }
    }
    checkGeneration()
    return () => { cancelled = true }
  }, [courseId, loading])

  async function handleShare() {
    setShareLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/courses/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, userId: session.user.id }),
    })
    const data = await res.json()
    if (data.shareCode) {
      const link = `${window.location.origin}/shared?code=${data.shareCode}`
      setShareLink(link)
      navigator.clipboard.writeText(link).then(() => setShareCopied(true)).catch(() => {})
      setTimeout(() => setShareCopied(false), 3000)
    }
    setShareLoading(false)
  }

  async function toggleComplete(lessonId: string) {
    if (!userId) return
    const current = progress[lessonId]
    if (current === 'completed') {
      // Unmark — set back to in_progress
      await supabase.from('progress').update({ status: 'in_progress', score: null, mastery_level: 0 }).eq('user_id', userId).eq('lesson_id', lessonId)
      setProgress(p => ({ ...p, [lessonId]: 'in_progress' }))
    } else {
      // Mark complete
      await fetch('/api/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lessonId, courseId, status: 'completed', score: 100 }),
      })
      setProgress(p => ({ ...p, [lessonId]: 'completed' }))
    }
  }


  const totalLessons = units.reduce((a, u) => a + u.lessons.length, 0)
  const completedLessons = Object.values(progress).filter(s => s === 'completed').length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const scoreValues = Object.values(scores)
  const avgScore = scoreValues.length > 0 ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) : 0
  const courseComplete = progressPct === 100
  const coursePassed = courseComplete && avgScore >= 70

  const statusIcon = (lessonId: string) => {
    const s = progress[lessonId]
    if (s === 'completed') return '✓'
    if (s === 'in_progress') return '▶'
    return '○'
  }
  const statusColor = (lessonId: string) => {
    const s = progress[lessonId]
    if (s === 'completed') return '#4ADE80'
    if (s === 'in_progress') return '#6366F1'
    return '#64748B'
  }

  const styles = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '1100px', margin: '0 auto', padding: '40px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' } as React.CSSProperties,
    courseHeader: { marginBottom: '32px' } as React.CSSProperties,
    badge: { background: 'rgba(99,102,241,0.15)', color: '#6366F1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, marginRight: '8px' } as React.CSSProperties,
    h1: { fontSize: '32px', fontWeight: 800, marginTop: '12px', marginBottom: '8px' } as React.CSSProperties,
    progressBar: { background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '8px', overflow: 'hidden', marginTop: '16px' } as React.CSSProperties,
    progressFill: { height: '100%', background: 'linear-gradient(90deg, #6366F1, #818CF8)', borderRadius: '4px' } as React.CSSProperties,
    unitCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' } as React.CSSProperties,
    unitHeader: { padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    unitTitle: { fontWeight: 700, fontSize: '15px' } as React.CSSProperties,
    lessonRow: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '12px', color: '#F1F5F9' } as React.CSSProperties,
    statsCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px' } as React.CSSProperties,
    statRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'block', textAlign: 'center' as const, marginTop: '16px' } as React.CSSProperties,
  }

  if (loading) return <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Loading course...</div></div>
  if (!course) return <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Course not found</div></div>

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontSize: '18px', fontWeight: 700 }}>LessonPilot</Link>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}>Dashboard</Link>
          <Link href={`/courses/${courseId}/progress`} style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}>Progress</Link>
        </div>
      </header>

      <div style={styles.main}>
        <div>
          <div style={styles.courseHeader}>
            <div>
              <span style={styles.badge}>{course.subject || 'Course'}</span>
              <span style={styles.badge}>{course.level}</span>
              {course.course_format === 'bootcamp' && (
                <span style={{ ...styles.badge, background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                  🏕️ {course.duration_days}-Day Bootcamp
                </span>
              )}
            </div>
            <h1 style={styles.h1}>{course.title}</h1>
            {course.goal && <p style={{ color: '#64748B', fontSize: '14px' }}>Goal: {course.goal}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>{completedLessons}/{totalLessons} lessons complete</span>
              <span style={{ color: '#6366F1', fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            <span style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#F1F5F9', background: '#0C1220' }}>Lessons</span>
            <Link href={`/courses/${courseId}/resources`} style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#64748B', textDecoration: 'none' }}>Resources</Link>
            <Link href={`/courses/${courseId}/progress`} style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#64748B', textDecoration: 'none' }}>Progress</Link>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Curriculum</h2>

          {generatingCount && (
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', color: '#A78BFA', fontWeight: 600 }}>AI is preparing your lessons</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{generatingCount.ready} of {generatingCount.total} ready — lessons become available as they finish</div>
              </div>
            </div>
          )}

          {units.length === 0 && (
            <div style={{ color: '#64748B', textAlign: 'center', padding: '40px' }}>
              Curriculum is being generated...
            </div>
          )}

          {units.map(unit => (
            <div key={unit.id} style={styles.unitCard}>
              <div style={styles.unitHeader}>
                <div>
                  <div style={styles.unitTitle}>{unit.title}</div>
                  {unit.summary && <div style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>{unit.summary}</div>}
                </div>
                <span style={{ color: '#64748B', fontSize: '12px' }}>{unit.lessons.length} lessons</span>
              </div>
              {unit.lessons.map(lesson => (
                <div key={lesson.id} style={styles.lessonRow}>
                  <button
                    onClick={() => toggleComplete(lesson.id)}
                    title={progress[lesson.id] === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    style={{ color: statusColor(lesson.id), fontWeight: 700, fontSize: '16px', width: '24px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    {statusIcon(lesson.id)}
                  </button>
                  <Link
                    href={`/courses/${courseId}/lesson/${lesson.id}`}
                    style={{ flex: 1, textDecoration: 'none', color: '#F1F5F9' }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{lesson.title}</div>
                    {lesson.objective && <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>{lesson.objective}</div>}
                  </Link>
                  <span style={{ color: '#64748B', fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px' }}>{lesson.difficulty}</span>
                  {lesson.estimated_minutes && <span style={{ color: '#64748B', fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px' }}>~{lesson.estimated_minutes}m</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div>
          <div style={styles.statsCard}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Course Stats</div>
            <div style={styles.statRow}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>Units</span>
              <span style={{ fontWeight: 600 }}>{units.length}</span>
            </div>
            <div style={styles.statRow}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>Lessons</span>
              <span style={{ fontWeight: 600 }}>{totalLessons}</span>
            </div>
            <div style={styles.statRow}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>Completed</span>
              <span style={{ color: '#4ADE80', fontWeight: 600 }}>{completedLessons}</span>
            </div>
            <div style={{ ...styles.statRow, borderBottom: 'none' }}>
              <span style={{ color: '#64748B', fontSize: '13px' }}>Mastery</span>
              <span style={{ color: '#6366F1', fontWeight: 700 }}>{progressPct}%</span>
            </div>

            {(() => {
              for (const unit of units) {
                for (const lesson of unit.lessons) {
                  if (progress[lesson.id] !== 'completed') {
                    return (
                      <Link href={`/courses/${courseId}/lesson/${lesson.id}`} style={styles.btn}>
                        {completedLessons === 0 ? '▶ Start Learning' : '▶ Continue Learning'}
                      </Link>
                    )
                  }
                }
              }
              return <div style={{ color: '#4ADE80', textAlign: 'center', marginTop: '16px', fontWeight: 600 }}>✓ Course Complete!</div>
            })()}

            <Link href={`/courses/${courseId}/progress`} style={{ ...styles.btn, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B' }}>
              View Progress
            </Link>

            {/* Share */}
            <button onClick={handleShare} disabled={shareLoading} style={{ ...styles.btn, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', width: '100%', marginTop: '8px' }}>
              {shareLoading ? '...' : shareCopied ? '✓ Link Copied!' : '🔗 Share Course'}
            </button>
            {shareLink && (
              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '6px', fontSize: '11px', color: '#A78BFA', wordBreak: 'break-all', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(shareLink); setShareCopied(true); setTimeout(() => setShareCopied(false), 3000) }}>
                {shareLink}
              </div>
            )}

            {/* Course Passed — Download Section */}
            {coursePassed && (
              <div style={{ marginTop: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎓</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ADE80', marginBottom: '4px' }}>Congratulations!</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>Avg score: {avgScore}% — Course passed</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <a href={`/api/courses/study-guide?courseId=${courseId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '10px', background: '#16A34A', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                    📥 Download Full Course
                  </a>
                  {units.map(unit => (
                    <a key={unit.id} href={`/api/courses/study-guide?courseId=${courseId}&unitId=${unit.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', fontSize: '12px', color: '#94A3B8' }}>
                      📄 {unit.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Course complete but not passing */}
            {courseComplete && !coursePassed && avgScore > 0 && (
              <div style={{ marginTop: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FBBF24', marginBottom: '4px' }}>Almost there!</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>Avg score: {avgScore}% — Need 70% to download</div>
                <Link href={`/courses/${courseId}/progress`} style={{ fontSize: '12px', color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }}>Review weak areas →</Link>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
