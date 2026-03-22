'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  title: string
  subject: string
  level: string
  created_at: string
  lesson_count?: number
  completed_count?: number
}

export default function CoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (!userRec) { setLoading(false); return }

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', userRec.id)
        .order('created_at', { ascending: false })

      if (!coursesData) { setLoading(false); return }

      // Enrich with lesson counts
      const enriched = await Promise.all(coursesData.map(async (c) => {
        const { count: lessonCount } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', c.id)

        const { count: completedCount } = await supabase
          .from('progress')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', c.id)
          .eq('user_id', userRec.id)
          .eq('status', 'completed')

        return { ...c, lesson_count: lessonCount ?? 0, completed_count: completedCount ?? 0 }
      }))

      setCourses(enriched)
      setLoading(false)
    }
    load()
  }, [router])

  const levelColor = (level: string) => {
    if (level === 'beginner') return '#4ADE80'
    if (level === 'intermediate') return '#FBBF24'
    if (level === 'advanced') return '#F87171'
    return '#6366F1'
  }

  const progressPct = (c: Course) => {
    if (!c.lesson_count) return 0
    return Math.round(((c.completed_count ?? 0) / c.lesson_count) * 100)
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    main: { maxWidth: '1000px', margin: '0 auto', padding: '40px 32px' } as React.CSSProperties,
    topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' as const, gap: '12px', transition: 'border-color 0.2s' } as React.CSSProperties,
    newBtn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
    levelBadge: (level: string) => ({
      display: 'inline-block',
      background: `${levelColor(level)}18`,
      color: levelColor(level),
      borderRadius: '6px',
      padding: '3px 10px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties),
    progressBar: { background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' } as React.CSSProperties,
    progressFill: (pct: number) => ({ width: `${pct}%`, height: '100%', background: pct === 100 ? '#4ADE80' : '#6366F1', borderRadius: '4px', transition: 'width 0.4s' } as React.CSSProperties),
    continueBtn: { background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '4px', textAlign: 'center' as const } as React.CSSProperties,
  }

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748B' }}>Loading courses...</div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <main style={s.main}>
        <div style={s.topRow}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>My Courses</h1>
            <p style={{ color: '#64748B', fontSize: '14px' }}>{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link href="/courses/new" style={s.newBtn}>
            ➕ New Course
          </Link>
        </div>

        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 32px', color: '#64748B' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#94A3B8', marginBottom: '8px' }}>No courses yet</h2>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Create your first course and start learning.</p>
            <Link href="/courses/new" style={{ ...s.newBtn, margin: '0 auto' }}>
              ➕ Create First Course
            </Link>
          </div>
        ) : (
          <div style={s.grid}>
            {courses.map(course => {
              const pct = progressPct(course)
              return (
                <div key={course.id} style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{course.title}</h3>
                    <span style={s.levelBadge(course.level)}>{course.level}</span>
                  </div>
                  <div style={{ color: '#64748B', fontSize: '13px' }}>{course.subject}</div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B', marginBottom: '6px' }}>
                      <span>{course.completed_count} / {course.lesson_count} lessons</span>
                      <span style={{ fontWeight: 700, color: pct === 100 ? '#4ADE80' : '#F1F5F9' }}>{pct}%</span>
                    </div>
                    <div style={s.progressBar}>
                      <div style={s.progressFill(pct)} />
                    </div>
                  </div>

                  <Link href={`/courses/${course.id}`} style={s.continueBtn}>
                    {pct === 0 ? '🚀 Start Course' : pct === 100 ? '✓ Review Course' : '▶ Continue'}
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
