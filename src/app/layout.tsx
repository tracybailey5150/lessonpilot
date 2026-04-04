import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LessonPilot.org — AI Teaching Platform',
  description: 'Upload what you need to learn. Get taught your way. AI-powered teaching that adapts to your style, pace, and goals.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#070C18', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>{children}</div>
        <footer style={{ width: '100%', padding: '14px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#050e1a' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            © 2026 LessonPilot™ · Tracy Bailey. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  )
}
