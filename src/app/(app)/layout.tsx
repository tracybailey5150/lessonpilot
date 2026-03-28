'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? null)
    })
  }, [router])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/courses', label: 'My Courses', icon: '📚' },
    { href: '/courses/new', label: 'New Course', icon: '➕' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  const ff = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // ── Desktop sidebar ──────────────────────────────────────────────────────
  const desktopSidebar = (
    <aside style={{
      width: '220px', flexShrink: 0, background: '#0A0F1C',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/dashboard" style={{ fontSize: '18px', fontWeight: 800, color: '#F1F5F9', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎓 <span>Lesson<span style={{ color: '#38BDF8' }}>Pilot</span></span>
        </Link>
      </div>
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        {navLinks.map(link => (
          <Link key={link.href} href={link.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '8px', textDecoration: 'none',
            fontSize: '14px', fontWeight: pathname === link.href ? 600 : 400,
            color: pathname === link.href ? '#38BDF8' : '#64748B',
            background: pathname === link.href ? 'rgba(56,189,248,0.08)' : 'transparent',
            marginBottom: '2px',
          }}>
            <span>{link.icon}</span><span>{link.label}</span>
          </Link>
        ))}
      </nav>
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {userEmail && <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>}
        <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', width: '100%' }}
          onClick={() => { supabase.auth.signOut(); router.push('/login') }}>
          Sign Out
        </button>
      </div>
    </aside>
  )

  // ── Mobile top bar ───────────────────────────────────────────────────────
  const mobileTopBar = (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: '#0A0F1C', borderBottom: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: '56px',
    }}>
      <Link href="/dashboard" style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9', textDecoration: 'none' }}>
        🎓 Lesson<span style={{ color: '#38BDF8' }}>Pilot</span>
      </Link>
      <button
        onClick={() => setMenuOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: '#F1F5F9', fontSize: '22px', cursor: 'pointer', padding: '8px', lineHeight: 1 }}
        aria-label="Menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
    </header>
  )

  // ── Mobile slide-down menu ───────────────────────────────────────────────
  const mobileMenu = menuOpen && (
    <div style={{
      position: 'fixed', top: '56px', left: 0, right: 0, zIndex: 99,
      background: '#0A0F1C', borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {navLinks.map(link => (
        <Link key={link.href} href={link.href} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '13px 14px', borderRadius: '10px', textDecoration: 'none',
          fontSize: '15px', fontWeight: pathname === link.href ? 700 : 400,
          color: pathname === link.href ? '#38BDF8' : '#94A3B8',
          background: pathname === link.href ? 'rgba(56,189,248,0.08)' : 'transparent',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '18px' }}>{link.icon}</span><span>{link.label}</span>
        </Link>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '8px', paddingTop: '12px' }}>
        {userEmail && <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', paddingLeft: '14px' }}>{userEmail}</div>}
        <button
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: '8px', padding: '10px 16px', fontSize: '14px', cursor: 'pointer', width: '100%' }}
          onClick={() => { supabase.auth.signOut(); router.push('/login') }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )

  // ── Mobile bottom nav ────────────────────────────────────────────────────
  const mobileBottomNav = (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: '#0A0F1C', borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', alignItems: 'stretch', height: '60px',
    }}>
      {navLinks.map(link => {
        const active = pathname === link.href || pathname.startsWith(link.href + '/')
        return (
          <Link key={link.href} href={link.href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '2px', textDecoration: 'none',
            color: active ? '#38BDF8' : '#475569',
            background: active ? 'rgba(56,189,248,0.05)' : 'transparent',
            fontSize: '10px', fontWeight: active ? 700 : 400,
            borderTop: active ? '2px solid #38BDF8' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  if (isMobile) {
    return (
      <div style={{ background: '#070C18', minHeight: '100vh', fontFamily: ff, color: '#F1F5F9' }}>
        {mobileTopBar}
        {mobileMenu}
        {/* Overlay to close menu */}
        {menuOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 98 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
        <main style={{ paddingTop: '56px', paddingBottom: '60px', minHeight: '100vh' }}>
          {children}
        </main>
        {mobileBottomNav}
      </div>
    )
  }

  // Desktop layout
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070C18', fontFamily: ff, color: '#F1F5F9' }}>
      {desktopSidebar}
      <main style={{ flex: 1, marginLeft: '220px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
