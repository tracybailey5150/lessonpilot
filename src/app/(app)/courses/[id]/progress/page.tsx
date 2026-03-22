'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface LessonProgress {
  lesson_id: string
  status: string
  score: number | null
  mastery_level: number
  attempts: number
  updated_at: string
  lesson?: { title: string; difficulty: string }
}

export default function ProgressPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [progress, setProgress] = useState<LessonProgress[]>([])
  const [course, setCourse] = useState<{ title: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', session.user.id).single()
      if (!userRec) return

      const { data: courseData } = await supabase.from('courses').select('title').eq('id', courseId).single()
      setCourse(courseData)

      const { data: progressData } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userRec.id)
        .eq('course_id', courseId)

      const { data: lessonsData } = await supabase.from('lessons').select('id, title, difficulty').eq('course_id', courseId)
      const lessonMap: Record<string, { title: string; difficulty: string }> = {}
      for (const l of lessonsData ?? []) { lessonMap[l.id] = l }

      const enriched = (progressData ?? []).map(p => ({ ...p, lesson: lessonMap[p.lesson_id] }))
      setProgress(enriched)

      setLoading(false)
    }
    load()
  }, [courseId, router])

  const completed = progress.filter(p => p.status === 'completed').length
  const total = progress.length
  const masterPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const avgScore = progress.filter(p => p.score != null).length > 0
    ? Math.round(progress.filter(p => p.score != null).reduce((a, p) => a + (p.score ?? 0), 0) / progress.filter(p => p.score != null).length)
    : null
  const weakAreas = progress.filter(p => p.score != null && (p.score ?? 100) < 70)

  const statusColor = (status: string) => {
    if (status === 'completed') return '#4ADE80'
    if (status === 'in_progress') return '#6366F1'
    return '#64748B'
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '900px', margin: '0 auto', padding: '40px 32px' } as React.CSSProperties,
    ring: { width: '160px', height: '160px', margin: '0 auto 32px', position: 'relative' as const, display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    ringText: { textAlign: 'center' as const } as React.CSSProperties,
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' } as React.CSSProperties,
    statCard: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px', textAlign: 'center' as const } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' } as React.CSSProperties,
    lessonRow: { padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    weakCard: { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', padding: '14px 20px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  }

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#64748B' }}>Loading...</div></div>

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontWeight: 700 }}>🎓 LessonPilot</Link>
        <Link href={`/courses/${courseId}`} style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px' }}>← Back to Course</Link>
      </header>

      <main style={s.main}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Progress Report</h1>
        <p style={{ color: '#64748B', marginBottom: '40px' }}>{course?.title}</p>

        {/* Big mastery ring */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" />
            <circle
              cx="80" cy="80" r="64"
              fill="none"
              stroke="#6366F1"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 64}`}
              strokeDashoffset={`${2 * Math.PI * 64 * (1 - masterPct / 100)}`}
              transform="rotate(-90 80 80)"
            />
            <text x="80" y="74" textAnchor="middle" fill="#F1F5F9" fontSize="28" fontWeight="800">{masterPct}%</text>
            <text x="80" y="96" textAnchor="middle" fill="#64748B" fontSize="12">mastery</text>
          </svg>
        </div>

        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#4ADE80' }}>{completed}</div>
            <div style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>Completed</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 800 }}>{total}</div>
            <div style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>Total Lessons</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: avgScore && avgScore >= 70 ? '#4ADE80' : '#F87171' }}>{avgScore != null ? `${avgScore}%` : '—'}</div>
            <div style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>Avg Quiz Score</div>
          </div>
          <div style={s.statCard}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#F87171' }}>{weakAreas.length}</div>
            <div style={{ color: '#64748B', fontSize: '13px', marginTop: '4px' }}>Weak Areas</div>
          </div>
        </div>

        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>⚠️ Weak Areas</h2>
            {weakAreas.map(p => (
              <div key={p.lesson_id} style={s.weakCard}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.lesson?.title || 'Lesson'}</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>{p.attempts} attempts · Score: {p.score}%</div>
                </div>
                <Link href={`/courses/${courseId}/lesson/${p.lesson_id}`} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* All lessons */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>All Lessons</h2>
        <div style={s.card}>
          {progress.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>No lessons started yet</div>
          )}
          {progress.map(p => (
            <div key={p.lesson_id} style={s.lessonRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: statusColor(p.status), fontWeight: 700 }}>
                  {p.status === 'completed' ? '✓' : p.status === 'in_progress' ? '▶' : '○'}
                </span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{p.lesson?.title || 'Lesson'}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{p.attempts} attempts</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {p.score != null && (
                  <span style={{ fontWeight: 700, color: p.score >= 70 ? '#4ADE80' : '#F87171', fontSize: '14px' }}>{p.score}%</span>
                )}
                <span style={{ color: statusColor(p.status), fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
