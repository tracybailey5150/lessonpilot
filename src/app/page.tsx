import Link from 'next/link'

export default function LandingPage() {
  const styles = {
    page: {
      background: '#070C18',
      color: '#F1F5F9',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: '100vh',
    } as React.CSSProperties,
    nav: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 40px',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    } as React.CSSProperties,
    logo: {
      fontSize: '22px',
      fontWeight: 700,
      color: '#F1F5F9',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    navLinks: {
      display: 'flex',
      gap: '24px',
      alignItems: 'center',
    } as React.CSSProperties,
    navLink: {
      color: '#64748B',
      textDecoration: 'none',
      fontSize: '14px',
    } as React.CSSProperties,
    btnPrimary: {
      background: '#38BDF8',
      color: '#070C18',
      padding: '10px 20px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,
    btnOutline: {
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#F1F5F9',
      padding: '10px 20px',
      borderRadius: '8px',
      textDecoration: 'none',
      fontSize: '14px',
      fontWeight: 600,
      background: 'transparent',
    } as React.CSSProperties,
    hero: {
      textAlign: 'center' as const,
      padding: '100px 40px 80px',
      maxWidth: '800px',
      margin: '0 auto',
    },
    badge: {
      display: 'inline-block',
      background: 'rgba(99,102,241,0.15)',
      border: '1px solid rgba(99,102,241,0.3)',
      color: '#6366F1',
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      marginBottom: '24px',
    } as React.CSSProperties,
    h1: {
      fontSize: '52px',
      fontWeight: 800,
      lineHeight: 1.15,
      marginBottom: '20px',
      background: 'linear-gradient(135deg, #F1F5F9 0%, #94A3B8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    } as React.CSSProperties,
    subheadline: {
      fontSize: '20px',
      color: '#64748B',
      lineHeight: 1.6,
      marginBottom: '40px',
    } as React.CSSProperties,
    ctaRow: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    ctaBig: {
      background: '#38BDF8',
      color: '#070C18',
      padding: '16px 32px',
      borderRadius: '10px',
      textDecoration: 'none',
      fontSize: '16px',
      fontWeight: 700,
    } as React.CSSProperties,
    ctaSecondary: {
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#F1F5F9',
      padding: '16px 32px',
      borderRadius: '10px',
      textDecoration: 'none',
      fontSize: '16px',
      fontWeight: 600,
      background: 'transparent',
    } as React.CSSProperties,
    section: {
      padding: '80px 40px',
      maxWidth: '1100px',
      margin: '0 auto',
    } as React.CSSProperties,
    sectionTitle: {
      textAlign: 'center' as const,
      fontSize: '32px',
      fontWeight: 700,
      marginBottom: '12px',
    },
    sectionSubtitle: {
      textAlign: 'center' as const,
      color: '#64748B',
      fontSize: '16px',
      marginBottom: '60px',
    },
    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
    } as React.CSSProperties,
    card: {
      background: '#0C1220',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding: '28px',
    } as React.CSSProperties,
    cardIcon: {
      fontSize: '32px',
      marginBottom: '16px',
    } as React.CSSProperties,
    cardTitle: {
      fontSize: '18px',
      fontWeight: 700,
      marginBottom: '8px',
    } as React.CSSProperties,
    cardText: {
      color: '#64748B',
      fontSize: '14px',
      lineHeight: 1.6,
    } as React.CSSProperties,
    pricingGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginTop: '40px',
    } as React.CSSProperties,
    pricingCard: {
      background: '#0C1220',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding: '32px',
    } as React.CSSProperties,
    pricingCardFeatured: {
      background: '#0C1220',
      border: '1px solid #6366F1',
      borderRadius: '12px',
      padding: '32px',
    } as React.CSSProperties,
    price: {
      fontSize: '40px',
      fontWeight: 800,
      marginBottom: '8px',
    } as React.CSSProperties,
    priceNote: {
      color: '#64748B',
      fontSize: '14px',
      marginBottom: '24px',
    } as React.CSSProperties,
    featureList: {
      listStyle: 'none',
      padding: 0,
      margin: '0 0 28px',
    } as React.CSSProperties,
    featureItem: {
      padding: '8px 0',
      color: '#94A3B8',
      fontSize: '14px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    } as React.CSSProperties,
    stepRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '40px',
    } as React.CSSProperties,
    step: {
      textAlign: 'center' as const,
    },
    stepNum: {
      width: '48px',
      height: '48px',
      background: 'rgba(99,102,241,0.15)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: '20px',
      fontWeight: 700,
      color: '#6366F1',
    } as React.CSSProperties,
    footer: {
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '40px',
      textAlign: 'center' as const,
      color: '#64748B',
      fontSize: '14px',
    },
    divider: {
      borderTop: '1px solid rgba(255,255,255,0.07)',
    } as React.CSSProperties,
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <a href="/" style={styles.logo}>🎓 LessonPilot</a>
        <div style={styles.navLinks}>
          <a href="#how-it-works" style={styles.navLink}>How it works</a>
          <a href="#pricing" style={styles.navLink}>Pricing</a>
          <Link href="/login" style={styles.btnOutline}>Log in</Link>
          <Link href="/signup" style={styles.btnPrimary}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.badge}>AI-Powered Teaching Platform</div>
        <h1 style={styles.h1}>Upload what you need to learn.<br />Get taught your way.</h1>
        <p style={styles.subheadline}>
          AI-powered teaching that adapts to your style, pace, and goals.<br />
          Most AI answers. LessonPilot teaches.
        </p>
        <div style={styles.ctaRow}>
          <Link href="/signup" style={styles.ctaBig}>Start Learning Free →</Link>
          <a href="#how-it-works" style={styles.ctaSecondary}>See how it works</a>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Features */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Everything you need to truly learn</h2>
        <p style={styles.sectionSubtitle}>Not just answers. Structured lessons, quizzes, and mastery tracking.</p>
        <div style={styles.grid3}>
          {[
            { icon: '📄', title: 'Upload Any Material', desc: 'PDFs, documents, or paste raw text. LessonPilot transforms it into a structured curriculum instantly.' },
            { icon: '🎯', title: 'Choose Your Style', desc: 'Plain English, Deep Dive, Step-by-Step, or Exam Prep. Teaching adapts to how you learn best.' },
            { icon: '📊', title: 'Track Mastery', desc: 'Progress rings, weak area detection, and spaced repetition. Know exactly what you know.' },
            { icon: '🤖', title: 'AI Teaching Agent', desc: 'Bailey AI powered lessons that explain, check understanding, and adapt when you struggle.' },
            { icon: '🧪', title: 'Smart Quizzes', desc: 'Auto-generated quizzes for every lesson. Multiple choice and short answer with instant feedback.' },
            { icon: '🔄', title: 'Review Weak Areas', desc: 'Automatic review queue for topics you missed. Re-explains with simpler language and new examples.' },
          ].map((f, i) => (
            <div key={i} style={styles.card}>
              <div style={styles.cardIcon}>{f.icon}</div>
              <div style={styles.cardTitle}>{f.title}</div>
              <div style={styles.cardText}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* How it works */}
      <section id="how-it-works" style={styles.section}>
        <h2 style={styles.sectionTitle}>How LessonPilot works</h2>
        <p style={styles.sectionSubtitle}>From raw material to mastery in 3 steps</p>
        <div style={styles.stepRow}>
          {[
            { num: '1', icon: '📤', title: 'Upload Your Material', desc: 'Paste text, upload a PDF, or drop in any study material. We parse and structure it.' },
            { num: '2', icon: '🗺️', title: 'AI Builds Your Curriculum', desc: 'Bailey AI generates a structured lesson plan with units, objectives, and difficulty levels.' },
            { num: '3', icon: '🎓', title: 'Learn & Track Mastery', desc: 'Go lesson by lesson. Quiz yourself. Get reteaught on weak areas. Watch mastery grow.' },
          ].map((s, i) => (
            <div key={i} style={styles.step}>
              <div style={styles.stepNum}>{s.num}</div>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{s.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{s.title}</div>
              <div style={{ color: '#64748B', fontSize: '14px', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.divider} />

      {/* Pricing */}
      <section id="pricing" style={styles.section}>
        <h2 style={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p style={styles.sectionSubtitle}>Start free. Scale when you&apos;re ready.</p>
        <div style={styles.pricingGrid}>
          {/* Free */}
          <div style={styles.pricingCard}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Free</div>
            <div style={styles.price}>$0</div>
            <div style={styles.priceNote}>Forever free</div>
            <ul style={styles.featureList}>
              {['1 course', '5 lessons', 'Basic quizzes', 'Progress tracking'].map((f, i) => (
                <li key={i} style={styles.featureItem}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/signup" style={{ ...styles.btnOutline, display: 'block', textAlign: 'center' }}>Get Started</Link>
          </div>

          {/* Pro */}
          <div style={styles.pricingCardFeatured}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700 }}>Pro</span>
              <span style={{ background: '#6366F1', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>POPULAR</span>
            </div>
            <div style={styles.price}>$19<span style={{ fontSize: '18px', fontWeight: 400 }}>/mo</span></div>
            <div style={styles.priceNote}>Everything you need</div>
            <ul style={styles.featureList}>
              {['Unlimited courses', 'Unlimited lessons', 'Smart quizzes + grading', 'Mastery tracking', 'Weak area review', 'RAG-powered teaching', 'All teaching styles'].map((f, i) => (
                <li key={i} style={styles.featureItem}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/signup" style={{ ...styles.btnPrimary, display: 'block', textAlign: 'center' }}>Start Pro Free</Link>
          </div>

          {/* Team */}
          <div style={styles.pricingCard}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Team</div>
            <div style={styles.price}>$49<span style={{ fontSize: '18px', fontWeight: 400 }}>/mo</span></div>
            <div style={styles.priceNote}>For teams & companies</div>
            <ul style={styles.featureList}>
              {['Everything in Pro', 'Multi-user management', 'Team analytics', 'Custom branding', 'Priority support', 'API access'].map((f, i) => (
                <li key={i} style={styles.featureItem}>✓ {f}</li>
              ))}
            </ul>
            <Link href="/signup" style={{ ...styles.btnOutline, display: 'block', textAlign: 'center' }}>Contact Sales</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={{ marginBottom: '12px' }}>🎓 <strong>LessonPilot.ai</strong></div>
        <div>AI-powered teaching that adapts to you.</div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
          <Link href="/login" style={{ color: '#64748B', textDecoration: 'none' }}>Login</Link>
          <Link href="/signup" style={{ color: '#64748B', textDecoration: 'none' }}>Sign Up</Link>
          <a href="#pricing" style={{ color: '#64748B', textDecoration: 'none' }}>Pricing</a>
        </div>
        <div style={{ marginTop: '24px', color: '#374151' }}>© 2026 LessonPilot.ai — All rights reserved</div>
      </footer>
    </div>
  )
}
