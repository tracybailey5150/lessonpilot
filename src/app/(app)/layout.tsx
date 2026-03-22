'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUserEmail(session.user.email ?? null)
    })
  }, [router])

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/courses', label: 'My Courses', icon: '📚' },
    { href: '/courses/new', label: 'New Course', icon: '➕' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  const s = {
    shell: {
      display: 'flex',
      minHeight: '100vh',
      background: '#070C18',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#F1F5F9',
    } as React.CSSProperties,
    sidebar: {
      width: '220px',
      flexShrink: 0,
      background: '#0A0F1C',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column' as const,
      padding: '0',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 50,
    },
    logoArea: {
      padding: '20px 20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    } as React.CSSProperties,
    logo: {
      fontSize: '18px',
      fontWeight: 800,
      color: '#F1F5F9',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    logoAccent: {
      color: '#38BDF8',
    } as React.CSSProperties,
    nav: {
      padding: '16px 12px',
      flex: 1,
    } as React.CSSProperties,
    navLink: (active: boolean) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: active ? 600 : 400,
      color: active ? '#38BDF8' : '#64748B',
      background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
      marginBottom: '2px',
      transition: 'background 0.15s',
    } as React.CSSProperties),
    sidebarBottom: {
      padding: '16px',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    } as React.CSSProperties,
    userInfo: {
      fontSize: '12px',
      color: '#475569',
      marginBottom: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    signOutBtn: {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.07)',
      color: '#475569',
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '12px',
      cursor: 'pointer',
      width: '100%',
    } as React.CSSProperties,
    main: {
      flex: 1,
      marginLeft: '220px',
      minHeight: '100vh',
    } as React.CSSProperties,
  }

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logoArea}>
          <Link href="/dashboard" style={s.logo}>
            🎓 <span>Lesson<span style={s.logoAccent}>Pilot</span></span>
          </Link>
        </div>
        <nav style={s.nav}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={s.navLink(pathname === link.href)}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
        <div style={s.sidebarBottom}>
          {userEmail && <div style={s.userInfo}>{userEmail}</div>}
          <button
            style={s.signOutBtn}
            onClick={() => { supabase.auth.signOut(); router.push('/login') }}
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main style={s.main}>
        {children}
      </main>
    </div>
  )
}
