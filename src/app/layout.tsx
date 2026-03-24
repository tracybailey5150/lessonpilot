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
      <body style={{ margin: 0, padding: 0, background: '#070C18' }}>
        {children}
      </body>
    </html>
  )
}
