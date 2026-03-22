'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? '')
      setUserId(session.user.id)
    })
  }, [router])

  const handleUpgrade = async (planKey: string) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, userId, userEmail }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage(data.error || 'Failed to start checkout')
      }
    } catch (e) {
      setMessage(String(e))
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    main: { maxWidth: '720px', margin: '0 auto', padding: '48px 32px' } as React.CSSProperties,
    section: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '28px', marginBottom: '24px' } as React.CSSProperties,
    sectionTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: '#F1F5F9' } as React.CSSProperties,
    label: { display: 'block', color: '#64748B', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '6px' } as React.CSSProperties,
    value: { fontSize: '15px', color: '#F1F5F9', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' } as React.CSSProperties,
    planCard: (highlight: boolean) => ({
      background: highlight ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
      border: highlight ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
    } as React.CSSProperties),
    planName: { fontSize: '16px', fontWeight: 700, marginBottom: '4px' } as React.CSSProperties,
    planDesc: { fontSize: '13px', color: '#64748B' } as React.CSSProperties,
    planPrice: { fontSize: '20px', fontWeight: 800, color: '#6366F1', whiteSpace: 'nowrap' as const } as React.CSSProperties,
    upgradeBtn: (planKey: string) => ({
      background: planKey === 'pro' ? '#6366F1' : '#8B5CF6',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      opacity: loading ? 0.6 : 1,
    } as React.CSSProperties),
    badge: { background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 } as React.CSSProperties,
  }

  return (
    <div style={s.page}>
      <main style={s.main}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: '#64748B', marginBottom: '40px' }}>Manage your account and billing</p>

        {message && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
            {message}
          </div>
        )}

        {/* Profile */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>👤 Profile</h2>
          <label style={s.label}>Email</label>
          <div style={s.value}>{userEmail || '—'}</div>
          <label style={s.label}>Account ID</label>
          <div style={{ ...s.value, fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{userId || '—'}</div>
        </div>

        {/* Plan */}
        <div style={s.section}>
          <h2 style={s.sectionTitle}>💳 Plan & Billing</h2>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>You&apos;re on the <strong style={{ color: '#F1F5F9' }}>Free Plan</strong>. Upgrade to unlock unlimited courses, priority AI, and team features.</p>

          {/* Free */}
          <div style={s.planCard(false)}>
            <div>
              <div style={s.planName}>Free</div>
              <div style={s.planDesc}>3 courses · 10 lessons each · Basic AI</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={s.planPrice}>$0</span>
              <span style={s.badge}>Current</span>
            </div>
          </div>

          {/* Pro */}
          <div style={s.planCard(true)}>
            <div>
              <div style={s.planName}>Pro ✨</div>
              <div style={s.planDesc}>Unlimited courses · Full AI engine · Progress analytics · Priority support</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={s.planPrice}>$19/mo</span>
              <button onClick={() => handleUpgrade('pro')} disabled={loading} style={s.upgradeBtn('pro')}>
                {loading ? '...' : 'Upgrade →'}
              </button>
            </div>
          </div>

          {/* Team */}
          <div style={s.planCard(false)}>
            <div>
              <div style={s.planName}>Team 🏢</div>
              <div style={s.planDesc}>Everything in Pro · 10 seats · Team dashboards · SSO</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={s.planPrice}>$49/mo</span>
              <button onClick={() => handleUpgrade('team')} disabled={loading} style={s.upgradeBtn('team')}>
                {loading ? '...' : 'Upgrade →'}
              </button>
            </div>
          </div>

          <p style={{ color: '#475569', fontSize: '12px', marginTop: '16px' }}>
            14-day free trial. Cancel anytime. All plans include SSL-encrypted storage and GDPR compliance.
          </p>
        </div>
      </main>
    </div>
  )
}
