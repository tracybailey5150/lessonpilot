'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: '20px' } as React.CSSProperties,
    card: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '420px' } as React.CSSProperties,
    logo: { textAlign: 'center' as const, fontSize: '22px', fontWeight: 700, color: '#F1F5F9', marginBottom: '8px' },
    subtitle: { textAlign: 'center' as const, color: '#64748B', fontSize: '14px', marginBottom: '32px' },
    label: { display: 'block', color: '#94A3B8', fontSize: '13px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 14px', color: '#F1F5F9', fontSize: '15px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: '20px' },
    btn: { width: '100%', background: '#38BDF8', color: '#070C18', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' } as React.CSSProperties,
    error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' } as React.CSSProperties,
    success: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ADE80', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' } as React.CSSProperties,
    footer: { textAlign: 'center' as const, color: '#64748B', fontSize: '14px', marginTop: '24px' },
    link: { color: '#38BDF8', textDecoration: 'none' },
    forgotLink: { display: 'block', textAlign: 'right' as const, color: '#475569', fontSize: '12px', textDecoration: 'none', marginTop: '-14px', marginBottom: '20px', cursor: 'pointer' },
  }

  if (resetMode) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.logo}>🎓 LessonPilot</div>
          <div style={s.subtitle}>Reset your password</div>

          {error && <div style={s.error}>{error}</div>}
          {resetSent && (
            <div style={s.success}>
              Check your email — we sent a password reset link to <strong>{email}</strong>
            </div>
          )}

          {!resetSent && (
            <form onSubmit={handleReset}>
              <label style={s.label}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={s.input} />
              <button type="submit" disabled={loading} style={s.btn}>
                {loading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
          )}

          <div style={s.footer}>
            <span style={{ ...s.link, cursor: 'pointer' }} onClick={() => { setResetMode(false); setResetSent(false); setError('') }}>
              ← Back to sign in
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>🎓 LessonPilot</div>
        <div style={s.subtitle}>Sign in to continue learning</div>

        {error && <div style={s.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <label style={s.label}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={s.input} />
          <label style={s.label}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={s.input} />
          <span style={s.forgotLink} onClick={() => { setResetMode(true); setError('') }}>
            Forgot password?
          </span>
          <button type="submit" disabled={loading} style={s.btn}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={s.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={s.link}>Sign up free</Link>
        </div>
      </div>
    </div>
  )
}
