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
  course_format?: string
  duration_days?: number
  created_at: string
}

interface ProgressItem {
  course_id: string
  lesson_id: string
  status: string
  score?: number
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#22c55e', intermediate: '#3b82f6', advanced: '#f59e0b', executive: '#a855f7',
}

function ProgressRing({ pct, size = 52, stroke = 4, color = '#6366f1' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central"
        fill="#e8ecf4" fontSize={size < 50 ? '11' : '13'} fontWeight="700">{pct}%</text>
    </svg>
  )
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
  const [showShareInput, setShowShareInput] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const authUser = session.user
      setUser({ email: authUser.email ?? '', full_name: authUser.user_metadata?.full_name })
      const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', authUser.id).single()
      if (userRec) {
        const { data: coursesData } = await supabase.from('courses').select('*').eq('user_id', userRec.id).order('created_at', { ascending: false })
        setCourses(coursesData ?? [])
        const { data: progressData } = await supabase.from('progress').select('course_id, lesson_id, status, score').eq('user_id', userRec.id)
        setProgress(progressData ?? [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleAddByUrl = async () => {
    if (!shareUrl.trim()) return
    setAddingCourse(true); setAddResult(null)
    try {
      const url = new URL(shareUrl.trim())
      const code = url.searchParams.get('code')
      if (!code) { setAddResult({ msg: 'Invalid share link', ok: false }); setAddingCourse(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/courses/share?code=${code}&userId=${session.user.id}`)
      const data = await res.json()
      if (data.status === 'claimed') { setAddResult({ msg: 'Course added!', ok: true }); router.push(`/courses/${data.courseId}`) }
      else if (data.status === 'already_claimed') { setAddResult({ msg: 'Already in your library', ok: true }) }
      else { setAddResult({ msg: data.error || 'Failed', ok: false }) }
    } catch { setAddResult({ msg: 'Invalid URL', ok: false }) }
    setAddingCourse(false); setShareUrl('')
  }

  const getStats = (courseId: string) => {
    const items = progress.filter(p => p.course_id === courseId)
    const completed = items.filter(p => p.status === 'completed').length
    const total = items.length
    const scores = items.filter(p => p.score != null).map(p => p.score!)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0, avgScore }
  }

  const continueCourse = courses.find(c => progress.some(p => p.course_id === c.id && p.status === 'in_progress')) ?? courses[0]
  const firstName = user?.full_name?.split(' ')[0] || ''
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const totalCompleted = progress.filter(p => p.status === 'completed').length
  const allScores = progress.filter(p => p.score != null).map(p => p.score!)
  const overallAvg = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null

  if (loading) return (
    <div style={{ background: '#080d1c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.15)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ background: '#080d1c', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#dde4f0' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes gridPulse { 0%,100%{opacity:0.015} 50%{opacity:0.035} }
        .c-card { transition: border-color 0.2s, box-shadow 0.2s; cursor: pointer; }
        .c-card:hover { border-color: rgba(99,102,241,0.3) !important; box-shadow: 0 4px 24px rgba(99,102,241,0.08); }
        .c-input:focus { border-color: rgba(99,102,241,0.4) !important; outline: none; }
        .c-btn:hover { filter: brightness(1.1); }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a1020' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 800, letterSpacing: '-0.04em' }}>LP</div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#dde4f0', letterSpacing: '-0.02em' }}>LessonPilot</span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link href="/settings" style={{ color: '#3d4666', fontSize: '12px', textDecoration: 'none' }}>Settings</Link>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: '#3d4666', fontSize: '12px' }}>{user?.email}</span>
          <button onClick={() => { supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#3d4666', borderRadius: '5px', padding: '5px 12px', fontSize: '11px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </header>

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 32px 80px', position: 'relative' }}>
        {/* Subtle grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', animation: 'gridPulse 8s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Greeting */}
          <div style={{ marginBottom: '28px', animation: 'fadeUp 0.3s ease' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px', animation: 'fadeUp 0.4s ease' }}>
            {[
              { label: 'Courses', value: courses.length, color: '#6366f1' },
              { label: 'Lessons Done', value: totalCompleted, color: '#22c55e' },
              { label: 'In Progress', value: progress.filter(p => p.status === 'in_progress').length, color: '#f59e0b' },
              { label: 'Avg Score', value: overallAvg !== null ? `${overallAvg}%` : '—', color: overallAvg !== null && overallAvg >= 70 ? '#22c55e' : '#ef4444' },
            ].map(stat => (
              <div key={stat.label} style={{ background: '#0e1429', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px 18px' }}>
                <div style={{ fontSize: '11px', color: '#3d4666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{stat.label}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, letterSpacing: '-0.02em' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Continue Learning */}
          {continueCourse && (() => {
            const st = getStats(continueCourse.id)
            return (
              <div style={{ background: '#0e1429', border: '1px solid rgba(99,102,241,0.12)', borderRadius: '12px', padding: '22px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '20px', animation: 'fadeUp 0.5s ease' }}>
                <ProgressRing pct={st.pct} size={56} stroke={5} color={st.pct === 100 ? '#22c55e' : '#6366f1'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Continue</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{continueCourse.title}</div>
                  <div style={{ fontSize: '12px', color: '#3d4666', marginTop: '2px' }}>{st.completed}/{st.total} lessons · {continueCourse.subject}</div>
                </div>
                <Link href={`/courses/${continueCourse.id}`} className="c-btn" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Resume</Link>
              </div>
            )
          })()}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', animation: 'fadeUp 0.55s ease' }}>
            <Link href="/courses/new" className="c-btn" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>+ New Course</Link>
            <button onClick={() => setShowShareInput(!showShareInput)} className="c-btn" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.06)', color: '#4b5574', borderRadius: '7px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Add Shared Course</button>
          </div>

          {showShareInput && (
            <div style={{ marginBottom: '20px', animation: 'fadeUp 0.2s ease' }}>
              <div style={{ display: 'flex', gap: '8px', maxWidth: '440px' }}>
                <input className="c-input" type="url" value={shareUrl} onChange={e => setShareUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddByUrl() }} placeholder="Paste share link..." autoFocus
                  style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '7px', padding: '9px 14px', color: '#dde4f0', fontSize: '13px' }} />
                <button onClick={handleAddByUrl} disabled={addingCourse || !shareUrl.trim()} className="c-btn" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '7px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: addingCourse || !shareUrl.trim() ? 0.35 : 1 }}>
                  {addingCourse ? '...' : 'Add'}
                </button>
              </div>
              {addResult && <div style={{ marginTop: '6px', fontSize: '12px', color: addResult.ok ? '#4ade80' : '#f87171' }}>{addResult.msg}</div>}
            </div>
          )}

          {/* Course Grid */}
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeUp 0.5s ease' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' }}>📚</div>
              <div style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>No courses yet</div>
              <div style={{ color: '#3d4666', marginBottom: '24px', fontSize: '13px' }}>Create your first course or add one from a shared link.</div>
              <Link href="/courses/new" className="c-btn" style={{ background: '#6366f1', color: '#fff', padding: '11px 28px', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>Create Course</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {courses.map((course, i) => {
                const st = getStats(course.id)
                const levelColor = LEVEL_COLORS[course.level] || '#4b5574'
                const isComplete = st.pct === 100
                return (
                  <Link key={course.id} href={`/courses/${course.id}`} className="c-card" style={{
                    background: '#0e1429', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '11px',
                    padding: '20px', textDecoration: 'none', color: '#dde4f0', display: 'flex', flexDirection: 'column',
                    animation: `fadeUp ${0.3 + i * 0.06}s ease`,
                  }}>
                    {/* Header row with ring */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: levelColor, flexShrink: 0 }} />
                          <span style={{ fontSize: '10px', fontWeight: 600, color: levelColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{course.level}</span>
                          {course.course_format === 'bootcamp' && (
                            <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>{course.duration_days}D</span>
                          )}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em', marginBottom: '3px' }}>{course.title}</div>
                        <div style={{ fontSize: '11px', color: '#3d4666' }}>{course.subject || 'General'}</div>
                      </div>
                      <ProgressRing pct={st.pct} size={44} stroke={3.5} color={isComplete ? '#22c55e' : '#6366f1'} />
                    </div>

                    {/* Bottom stats */}
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '11px', color: '#3d4666' }}>{st.completed}/{st.total} lessons</span>
                      {st.avgScore !== null && (
                        <span style={{ fontSize: '11px', color: st.avgScore >= 70 ? '#22c55e' : '#f87171', fontWeight: 600 }}>{st.avgScore}% avg</span>
                      )}
                      {isComplete && <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, marginLeft: 'auto' }}>PASSED</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
