'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Course {
  id: string
  title: string
  subject: string
  level: string
  course_format: string
  duration_days: number | null
  is_featured: boolean
  price: number
  tier: string
  category: string
  description: string | null
  preview_image: string | null
  lessonCount: number
  moduleCount: number
}

interface UserAccess {
  role: string
  subscription_status: string
  enrolledCourseIds: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  'all': 'All Courses',
  'certification': 'Certification Prep',
  'av-technology': 'AV Technology',
  'business': 'Business & Leadership',
  'creative': 'Creative',
  'development': 'Development',
  'safety': 'Safety',
  'general': 'General',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#22C55E',
  intermediate: '#3B82F6',
  'Beginner to Intermediate': '#22C55E',
  advanced: '#F59E0B',
  executive: '#A78BFA',
}

const TIER_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  free: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', label: 'Free' },
  premium: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Premium' },
  pro: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', label: 'Pro' },
}

export default function CatalogPageWrapper() {
  return (
    <Suspense>
      <CatalogPage />
    </Suspense>
  )
}

function CatalogPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [authId, setAuthId] = useState<string | null>(null)
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const searchParams = useSearchParams()

  const loadAccess = useCallback(async (uid: string) => {
    const res = await fetch(`/api/catalog/enroll?authId=${uid}`)
    if (res.ok) {
      const data = await res.json()
      setAccess(data)
    }
  }, [])

  useEffect(() => {
    // Load courses
    fetch('/api/catalog')
      .then(r => r.json())
      .then(d => { setCourses(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))

    // Check auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setAuthId(session.user.id)
        await loadAccess(session.user.id)
      }
    })
  }, [loadAccess])

  // Handle post-purchase enrollment
  useEffect(() => {
    const enrolledId = searchParams.get('enrolled')
    if (enrolledId && authId) {
      setToast({ msg: 'Course purchased! You now have access.', ok: true })
      loadAccess(authId)
      setTimeout(() => setToast(null), 4000)
    }
  }, [searchParams, authId, loadAccess])

  const handleEnroll = async (courseId: string) => {
    if (!authId) {
      window.location.href = '/signup'
      return
    }
    setEnrolling(courseId)
    try {
      const res = await fetch('/api/catalog/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, courseId }),
      })
      const data = await res.json()

      if (data.status === 'enrolled' || data.status === 'already_enrolled') {
        setToast({ msg: data.status === 'already_enrolled' ? 'Already in your library!' : 'Course added to your library!', ok: true })
        await loadAccess(authId)
      } else if (data.status === 'checkout' && data.url) {
        window.location.href = data.url
        return
      } else if (data.status === 'upgrade_required') {
        window.location.href = '/settings'
        return
      } else {
        setToast({ msg: data.error || 'Something went wrong', ok: false })
      }
    } catch {
      setToast({ msg: 'Failed to enroll', ok: false })
    }
    setEnrolling(null)
    setTimeout(() => setToast(null), 4000)
  }

  const isEnrolled = (courseId: string) => access?.enrolledCourseIds?.includes(courseId)
  const hasFullAccess = access?.role === 'owner' || ['active', 'trialing'].includes(access?.subscription_status ?? '')
  const isLoggedIn = !!authId

  const categories = ['all', ...Array.from(new Set(courses.map(c => c.category))).filter(Boolean)]
  const filtered = filter === 'all' ? courses : courses.filter(c => c.category === filter)

  const getButtonState = (course: Course) => {
    if (!isLoggedIn) return { label: 'Start Learning', style: 'cta' as const }
    if (isEnrolled(course.id)) return { label: 'Go to Course', style: 'enrolled' as const }
    if (hasFullAccess || course.tier === 'free') return { label: 'Add to Library', style: 'add' as const }
    if (course.price && Number(course.price) > 0) return { label: `Buy — $${course.price}`, style: 'buy' as const }
    return { label: 'Upgrade to Access', style: 'upgrade' as const }
  }

  return (
    <div style={{ background: '#070C18', minHeight: '100vh', color: '#F1F5F9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cat-card { transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .cat-card:hover { border-color: rgba(56,189,248,0.3) !important; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(56,189,248,0.08); }
        .cat-btn { transition: all 0.15s; }
        .cat-btn:hover { filter: brightness(1.15); }
        @keyframes toastIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
        @media (max-width: 768px) {
          .cat-hero-title { font-size: 32px !important; }
          .cat-grid { grid-template-columns: 1fr !important; }
          .cat-nav-inner { padding: 0 16px !important; }
          .cat-content { padding: 0 16px 60px !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.ok ? '#4ADE80' : '#F87171',
          padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
          backdropFilter: 'blur(12px)', animation: 'toastIn 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 40px', borderBottom: '1px solid rgba(255,255,255,0.07)' }} className="cat-nav-inner">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image src="/lessonpilot-logo.png" alt="LessonPilot" width={30} height={30} style={{ objectFit: 'contain', borderRadius: '6px' }} />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9' }}>Lesson<span style={{ color: '#38BDF8' }}>Pilot</span></span>
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link href="/catalog" style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Catalog</Link>
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: '14px' }}>Dashboard</Link>
              {access?.role === 'owner' && (
                <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner</span>
              )}
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: '#64748B', textDecoration: 'none', fontSize: '14px' }}>Log In</Link>
              <Link href="/signup" style={{ background: '#38BDF8', color: '#070C18', padding: '8px 18px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Sign Up Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '72px 40px 48px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '20px' }}>
          Course Catalog
        </div>
        <h1 className="cat-hero-title" style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', background: 'linear-gradient(135deg, #F1F5F9, #94A3B8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Expert-Built Courses, Ready to Learn
        </h1>
        <p style={{ fontSize: '17px', color: '#64748B', lineHeight: 1.6, marginBottom: '8px' }}>
          Professional training courses in AV technology, certifications, and business — built by industry experts with AI-powered learning tools.
        </p>
        {isLoggedIn && hasFullAccess && (
          <p style={{ fontSize: '13px', color: '#4ADE80', marginTop: '12px' }}>
            You have full access — add any course to your library instantly.
          </p>
        )}
      </div>

      {/* Content */}
      <div className="cat-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px 80px' }}>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map(cat => {
            const active = filter === cat
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className="cat-btn"
                style={{
                  background: active ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  color: active ? '#38BDF8' : '#64748B',
                  borderRadius: '20px', padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(56,189,248,0.15)', borderTopColor: '#38BDF8', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>No courses in this category yet</div>
          </div>
        ) : (
          <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filtered.map((course, i) => {
              const levelColor = LEVEL_COLORS[course.level] || '#64748B'
              const tier = TIER_BADGE[course.tier] || TIER_BADGE.free
              const btn = getButtonState(course)
              const enrolled = isEnrolled(course.id)
              const isLoading = enrolling === course.id

              const btnStyles: Record<string, React.CSSProperties> = {
                cta: { background: course.is_featured ? '#38BDF8' : 'rgba(56,189,248,0.1)', color: course.is_featured ? '#070C18' : '#38BDF8', border: course.is_featured ? 'none' : '1px solid rgba(56,189,248,0.2)' },
                enrolled: { background: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.2)' },
                add: { background: '#38BDF8', color: '#070C18', border: 'none' },
                buy: { background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#fff', border: 'none' },
                upgrade: { background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)' },
              }

              return (
                <div
                  key={course.id}
                  className="cat-card"
                  style={{
                    background: '#0D1424', border: `1px solid ${course.is_featured ? 'rgba(56,189,248,0.15)' : enrolled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '14px', overflow: 'hidden',
                    animation: `fadeUp ${0.2 + i * 0.05}s ease`,
                    display: 'flex', flexDirection: 'column',
                  }}
                >
                  {/* Card top accent */}
                  <div style={{ height: '3px', background: enrolled ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : course.is_featured ? 'linear-gradient(90deg, #38BDF8, #6366F1)' : 'rgba(255,255,255,0.04)' }} />

                  <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Badges row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}30`, fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tier.label}</span>
                      <span style={{ background: `${levelColor}15`, color: levelColor, fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px' }}>{course.level}</span>
                      {course.course_format === 'bootcamp' && (
                        <span style={{ background: 'rgba(239,68,68,0.08)', color: '#F87171', fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px' }}>Bootcamp</span>
                      )}
                      {course.is_featured && (
                        <span style={{ background: 'rgba(56,189,248,0.1)', color: '#38BDF8', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px' }}>Featured</span>
                      )}
                      {enrolled && (
                        <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '10px' }}>In Library</span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#F1F5F9', lineHeight: 1.3, marginBottom: '8px' }}>
                      {course.title}
                    </h3>

                    {/* Description */}
                    {course.description && (
                      <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '16px', flex: 1 }}>
                        {course.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', marginBottom: '18px', flexWrap: 'wrap' }}>
                      {course.moduleCount > 0 && <span>{course.moduleCount} modules</span>}
                      <span>{course.lessonCount} lessons</span>
                      {course.duration_days && <span>{course.duration_days} days</span>}
                      {course.subject && <span>{course.subject}</span>}
                    </div>

                    {/* Footer: CTA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '12px', color: '#475569' }}>
                        {enrolled ? 'Added to your library' : hasFullAccess ? 'Included with your plan' : course.tier === 'free' ? 'Free course' : `$${course.price}`}
                      </span>
                      {enrolled ? (
                        <Link
                          href="/dashboard"
                          className="cat-btn"
                          style={{ ...btnStyles.enrolled, padding: '9px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}
                        >
                          Go to Dashboard
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleEnroll(course.id)}
                          disabled={isLoading}
                          className="cat-btn"
                          style={{
                            ...btnStyles[btn.style],
                            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                            cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {isLoading ? 'Adding...' : btn.label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', padding: '64px 0 0' }}>
          <div style={{ background: '#0D1424', border: '1px solid rgba(56,189,248,0.1)', borderRadius: '16px', padding: '48px 32px', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '10px' }}>Build Your Own Course</h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: 1.6 }}>
              Create custom AI-powered courses on any topic. Upload your materials, and LessonPilot generates lessons, quizzes, and study guides automatically.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isLoggedIn ? (
                <Link href="/courses/new" className="cat-btn" style={{ background: '#38BDF8', color: '#070C18', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Create a Course</Link>
              ) : (
                <Link href="/signup" className="cat-btn" style={{ background: '#38BDF8', color: '#070C18', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Get Started Free</Link>
              )}
              <Link href="/" className="cat-btn" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600 }}>Learn More</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
