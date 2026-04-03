'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SharedCoursePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [courseInfo, setCourseInfo] = useState<{ courseTitle: string; subject: string; level: string } | null>(null)
  const [status, setStatus] = useState<'loading' | 'preview' | 'claiming' | 'done' | 'already' | 'error' | 'login'>('loading')
  const [error, setError] = useState('')
  const [newCourseId, setNewCourseId] = useState<string | null>(null)

  useEffect(() => {
    if (!code) { setStatus('error'); setError('No share code provided'); return }

    async function load() {
      // Get course preview info
      const previewRes = await fetch(`/api/courses/share?code=${code}`)
      const previewData = await previewRes.json()
      if (previewData.error) { setStatus('error'); setError(previewData.error); return }
      setCourseInfo(previewData)

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatus('login'); return }

      setStatus('preview')
    }
    load()
  }, [code])

  const handleClaim = async () => {
    setStatus('claiming')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStatus('login'); return }

    const res = await fetch(`/api/courses/share?code=${code}&userId=${session.user.id}`)
    const data = await res.json()

    if (data.status === 'already_claimed') {
      setNewCourseId(data.courseId)
      setStatus('already')
    } else if (data.status === 'claimed') {
      setNewCourseId(data.courseId)
      setStatus('done')
    } else {
      setError(data.error || 'Failed to add course')
      setStatus('error')
    }
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '40px', maxWidth: '460px', width: '100%', textAlign: 'center' as const } as React.CSSProperties,
    btn: { background: '#6366F1', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 28px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {status === 'loading' && <div style={{ color: '#64748B' }}>Loading...</div>}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{error}</div>
            <Link href="/dashboard" style={{ ...s.btn, marginTop: '16px' }}>Go to Dashboard</Link>
          </>
        )}

        {status === 'login' && courseInfo && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎓</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>{courseInfo.courseTitle}</div>
            <div style={{ color: '#64748B', marginBottom: '24px' }}>{courseInfo.subject} · {courseInfo.level}</div>
            <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>Sign in or create an account to add this course to your library.</div>
            <Link href={`/login?redirect=/shared?code=${code}`} style={s.btn}>Sign In to Add Course</Link>
            <div style={{ marginTop: '12px' }}>
              <Link href={`/signup?redirect=/shared?code=${code}`} style={{ color: '#6366F1', fontSize: '14px', textDecoration: 'none' }}>Create an account →</Link>
            </div>
          </>
        )}

        {status === 'preview' && courseInfo && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎓</div>
            <div style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 600, marginBottom: '8px' }}>SHARED COURSE</div>
            <div style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>{courseInfo.courseTitle}</div>
            <div style={{ color: '#64748B', marginBottom: '24px' }}>{courseInfo.subject} · {courseInfo.level}</div>
            <div style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>Someone shared this course with you. Add it to your library to start learning.</div>
            <button onClick={handleClaim} style={s.btn}>Add to My Courses</button>
          </>
        )}

        {status === 'claiming' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ color: '#64748B' }}>Copying course to your library...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </>
        )}

        {status === 'done' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Course Added!</div>
            <div style={{ color: '#64748B', marginBottom: '24px' }}>{courseInfo?.courseTitle} is now in your library.</div>
            <Link href={newCourseId ? `/courses/${newCourseId}` : '/dashboard'} style={s.btn}>Start Learning →</Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Already in Your Library</div>
            <div style={{ color: '#64748B', marginBottom: '24px' }}>You've already added this course.</div>
            <Link href={newCourseId ? `/courses/${newCourseId}` : '/dashboard'} style={s.btn}>Go to Course →</Link>
          </>
        )}
      </div>
    </div>
  )
}
