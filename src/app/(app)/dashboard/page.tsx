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
  status: string
  created_at: string
}

interface ProgressItem {
  course_id: string
  lesson_id: string
  status: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [addResult, setAddResult] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const authUser = session.user
      setUser({ email: authUser.email ?? '', full_name: authUser.user_metadata?.full_name })

      // Get user record
      const { data: userRec } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_auth_id', authUser.id)
        .single()

      if (userRec) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', userRec.id)
          .order('created_at', { ascending: false })
        setCourses(coursesData ?? [])

        const { data: progressData } = await supabase
          .from('progress')
          .select('course_id, lesson_id, status')
          .eq('user_id', userRec.id)
        setProgress(progressData ?? [])
      }

      setLoading(false)
    }
    load()
  }, [router])

  const handleAddByUrl = async () => {
    if (!shareUrl.trim()) return
    setAddingCourse(true)
    setAddResult(null)
    try {
      const url = new URL(shareUrl.trim())
      const code = url.searchParams.get('code')
      if (!code) { setAddResult({ msg: 'Invalid share link — no code found', ok: false }); setAddingCourse(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/courses/share?code=${code}&userId=${session.user.id}`)
      const data = await res.json()
      if (data.status === 'claimed') {
        setAddResult({ msg: 'Course added!', ok: true })
        router.push(`/courses/${data.courseId}`)
      } else if (data.status === 'already_claimed') {
        setAddResult({ msg: 'Already in your library', ok: true })
      } else {
        setAddResult({ msg: data.error || 'Failed to add course', ok: false })
      }
    } catch {
      setAddResult({ msg: 'Invalid URL', ok: false })
    }
    setAddingCourse(false)
    setShareUrl('')
  }

  const getCompletedCount = (courseId: string) =>
    progress.filter(p => p.course_id === courseId && p.status === 'completed').length

  const getTotalCount = (courseId: string) =>
    progress.filter(p => p.course_id === courseId).length

  const continueCourse = courses.find(c =>
    progress.some(p => p.course_id === c.id && p.status === 'in_progress')
  ) ?? courses[0]

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    logo: { fontSize: '18px', fontWeight: 700, color: '#F1F5F9', textDecoration: 'none' },
    main: { maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' } as React.CSSProperties,
    welcome: { fontSize: '28px', fontWeight: 700, marginBottom: '8px' } as React.CSSProperties,
    subtitle: { color: '#64748B', marginBottom: '40px' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', textDecoration: 'none', color: '#F1F5F9', display: 'block' } as React.CSSProperties,
    cardTitle: { fontSize: '16px', fontWeight: 700, marginBottom: '6px' } as React.CSSProperties,
    cardMeta: { color: '#64748B', fontSize: '13px', marginBottom: '16px' } as React.CSSProperties,
    progressBar: { background: 'rgba(255,255,255,0.07)', borderRadius: '4px', height: '6px', overflow: 'hidden' } as React.CSSProperties,
    progressFill: { height: '100%', background: '#6366F1', borderRadius: '4px', transition: 'width 0.3s' } as React.CSSProperties,
    newCourseCard: { background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: '12px', padding: '24px', textDecoration: 'none', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: 600 } as React.CSSProperties,
    continueCard: { background: '#0C1220', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '28px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    sectionTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '20px' } as React.CSSProperties,
    badge: { background: 'rgba(99,102,241,0.15)', color: '#6366F1', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' } as React.CSSProperties,
    logoutBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748B', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  }

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748B' }}>Loading...</div>
    </div>
  )

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/dashboard" style={s.logo as React.CSSProperties}>🎓 LessonPilot</Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#64748B', fontSize: '13px' }}>{user?.email}</span>
          <button onClick={() => { supabase.auth.signOut(); router.push('/login') }} style={s.logoutBtn}>Sign Out</button>
        </div>
      </header>

      <main style={s.main}>
        <h1 style={s.welcome}>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋</h1>
        <p style={s.subtitle}>Pick up where you left off or start something new.</p>

        {/* Continue Learning */}
        {continueCourse && (
          <div style={s.continueCard}>
            <div>
              <div style={{ color: '#6366F1', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>CONTINUE LEARNING</div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{continueCourse.title}</div>
              <div style={{ color: '#64748B', fontSize: '13px' }}>{continueCourse.subject} · {continueCourse.level}</div>
            </div>
            <Link href={`/courses/${continueCourse.id}`} style={s.btn}>Continue →</Link>
          </div>
        )}

        {/* My Courses */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={s.sectionTitle}>My Courses</div>
            <Link href="/courses/new" style={s.btn}>+ New Course</Link>
          </div>
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No courses yet</div>
              <div style={{ marginBottom: '24px' }}>Create your first course to start learning</div>
              <Link href="/courses/new" style={s.btn}>Create Course</Link>
            </div>
          ) : (
            <div style={s.grid}>
              {courses.map(course => {
                const completed = getCompletedCount(course.id)
                const total = getTotalCount(course.id)
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={s.badge}>{course.subject || 'General'}</span>
                      <span style={{ color: '#64748B', fontSize: '12px' }}>{course.level}</span>
                    </div>
                    <div style={s.cardTitle}>{course.title}</div>
                    <div style={s.cardMeta}>{completed}/{total} lessons complete</div>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${pct}%` }} />
                    </div>
                    <div style={{ color: '#6366F1', fontSize: '12px', fontWeight: 600, marginTop: '8px' }}>{pct}%</div>
                  </Link>
                )
              })}
              <Link href="/courses/new" style={s.newCourseCard}>
                <span style={{ fontSize: '24px' }}>+</span>
                <span>New Course</span>
              </Link>
            </div>
          )}
        </div>

        {/* Add Course by URL */}
        <div style={{ marginTop: '40px' }}>
          <div style={s.sectionTitle}>Add Shared Course</div>
          <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
            <input
              type="url"
              value={shareUrl}
              onChange={e => setShareUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddByUrl() }}
              placeholder="Paste share link here..."
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '11px 14px', color: '#F1F5F9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={handleAddByUrl} disabled={addingCourse || !shareUrl.trim()} style={{ ...s.btn, opacity: addingCourse || !shareUrl.trim() ? 0.5 : 1 }}>
              {addingCourse ? '...' : 'Add'}
            </button>
          </div>
          {addResult && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: addResult.ok ? '#4ADE80' : '#F87171' }}>
              {addResult.msg}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
