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
}

export default function CoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [progress, setProgress] = useState<Record<string, string>>({})
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
        const { data: progressData } = await supabase.from('progress').select('lesson_id, status').eq('user_id', userRec.id).eq('course_id', courseId)
        const progressMap: Record<string, string> = {}
        for (const p of progressData ?? []) { progressMap[p.lesson_id] = p.status }
        setProgress(progressMap)
      }

      setLoading(false)
    }
    load()
  }, [courseId, router])

  const totalLessons = units.reduce((a, u) => a + u.lessons.length, 0)
  const completedLessons = Object.values(progress).filter(s => s === 'completed').length
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

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
    lessonRow: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#F1F5F9', cursor: 'pointer' } as React.CSSProperties,
    statsCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px' } as React.CSSProperties,
    statRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'block', textAlign: 'center' as const, marginTop: '16px' } as React.CSSProperties,
  }

  if (loading) return <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Loading course...</div></div>
  if (!course) return <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Course not found</div></div>

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontSize: '18px', fontWeight: 700 }}>🎓 LessonPilot</Link>
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

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
            <span style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#F1F5F9', background: '#0C1220' }}>Lessons</span>
            <Link href={`/courses/${courseId}/resources`} style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#64748B', textDecoration: 'none' }}>Resources</Link>
            <Link href={`/courses/${courseId}/progress`} style={{ padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, color: '#64748B', textDecoration: 'none' }}>Progress</Link>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Curriculum</h2>

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
                <Link
                  key={lesson.id}
                  href={`/courses/${courseId}/lesson/${lesson.id}`}
                  style={styles.lessonRow}
                >
                  <span style={{ color: statusColor(lesson.id), fontWeight: 700, fontSize: '16px', width: '20px' }}>
                    {statusIcon(lesson.id)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{lesson.title}</div>
                    {lesson.objective && <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>{lesson.objective}</div>}
                  </div>
                  <span style={{ color: '#64748B', fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '20px' }}>{lesson.difficulty}</span>
                </Link>
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

            {/* Find first incomplete lesson */}
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
              return <div style={{ color: '#4ADE80', textAlign: 'center', marginTop: '16px', fontWeight: 600 }}>🎉 Course Complete!</div>
            })()}

            <Link href={`/courses/${courseId}/progress`} style={{ ...styles.btn, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B' }}>
              View Progress
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
