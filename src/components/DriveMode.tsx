'use client'

/**
 * DriveMode — Hands-free audio learning with voice commands
 * Like having an MIT professor in the passenger seat.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface Lesson {
  id: string
  title: string
  objective: string
  content: string
  examples: string
  key_terms: string[] | Record<string, string>
  recap: string
  difficulty: string
  course_id: string
}

interface DriveModeProps {
  lesson: Lesson
  courseId: string
  voiceId?: string
  onNavigate: (path: string) => void
  onClose: () => void
}

type Section = 'intro' | 'content' | 'examples' | 'terms' | 'recap' | 'done'

const VOICE_COMMANDS: Record<string, string[]> = {
  pause:    ['pause', 'stop talking', 'hold on', 'wait'],
  resume:   ['resume', 'continue', 'keep going', 'play', 'go ahead'],
  repeat:   ['repeat', 'say that again', 'again', 'what was that'],
  back:     ['go back', 'previous', 'back up'],
  faster:   ['speed up', 'faster', 'go faster', 'quicker'],
  slower:   ['slow down', 'slower', 'too fast'],
  skip:     ['skip', 'next section', 'skip ahead'],
  recap:    ['skip to recap', 'summary', 'recap'],
  quiz:     ['quiz me', 'take a quiz', 'test me', 'quiz'],
  next:     ['next lesson', 'move on', 'continue to next'],
  stop:     ['stop', 'exit', 'quit drive mode', 'turn off'],
}

function matchCommand(transcript: string): string | null {
  const lower = transcript.toLowerCase().trim()
  for (const [cmd, phrases] of Object.entries(VOICE_COMMANDS)) {
    if (phrases.some(p => lower.includes(p))) return cmd
  }
  return null
}

function buildSections(lesson: Lesson): { id: Section; label: string; text: string }[] {
  const keyTermsArray = Array.isArray(lesson.key_terms)
    ? lesson.key_terms
    : lesson.key_terms
      ? Object.entries(lesson.key_terms).map(([k, v]) => `${k}: ${v}`)
      : []

  const items: { id: Section; label: string; text: string }[] = [
    {
      id: 'intro' as Section,
      label: 'Introduction',
      text: `Welcome to ${lesson.title}. Your learning objective for this module is: ${lesson.objective}. Let's begin.`,
    },
    {
      id: 'content' as Section,
      label: 'Lesson',
      text: lesson.content || `This module covers ${lesson.title}.`,
    },
    {
      id: 'examples' as Section,
      label: 'Examples',
      text: lesson.examples
        ? `Let's look at some real-world examples. ${lesson.examples}`
        : '',
    },
    {
      id: 'terms' as Section,
      label: 'Key Terms',
      text: keyTermsArray.length > 0
        ? `Here are the key terms for this module. ${keyTermsArray.join('. ')}.`
        : '',
    },
    {
      id: 'recap' as Section,
      label: 'Recap',
      text: lesson.recap
        ? `Let's recap what we covered. ${lesson.recap} That wraps up ${lesson.title}. You can say "quiz me" to test your knowledge, or "next lesson" to continue.`
        : `That wraps up ${lesson.title}. Say "quiz me" to test your knowledge, or "next lesson" to continue.`,
    },
  ]
  return items.filter(s => s.text.trim().length > 0)
}

export default function DriveMode({ lesson, courseId, voiceId = 'onyx', onNavigate, onClose }: DriveModeProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [statusMsg, setStatusMsg] = useState('Tap 🚗 Drive Mode to start')
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const sectionsRef = useRef(buildSections(lesson))
  const currentIdxRef = useRef(0)
  const speedRef = useRef(1)
  const pausedRef = useRef(false)

  // Keep refs in sync
  useEffect(() => { currentIdxRef.current = currentSectionIdx }, [currentSectionIdx])
  useEffect(() => { speedRef.current = speed }, [speed])

  const announce = useCallback((text: string) => {
    setStatusMsg(text)
  }, [])

  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
  }, [])

  const speakText = useCallback(async (text: string, onDone?: () => void) => {
    stopAudio()
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 4096), voice: voiceId }),
      })
      if (!res.ok) { onDone?.(); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      const audio = new Audio(url)
      audio.playbackRate = speedRef.current
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); blobUrlRef.current = null; onDone?.() }
      audio.onerror = () => { URL.revokeObjectURL(url); blobUrlRef.current = null; onDone?.() }
      await audio.play()
    } catch {
      onDone?.()
    }
  }, [voiceId, stopAudio])

  const playSection = useCallback((idx: number) => {
    const sections = sectionsRef.current
    if (idx >= sections.length) {
      setIsPlaying(false)
      setStatusMsg('✅ Lesson complete! Say "quiz me" or "next lesson"')
      return
    }
    const section = sections[idx]
    setCurrentSectionIdx(idx)
    setStatusMsg(`📖 ${section.label}`)
    setIsPlaying(true)
    setIsPaused(false)
    pausedRef.current = false
    speakText(section.text, () => {
      if (!pausedRef.current) {
        // Brief pause between sections
        setTimeout(() => {
          if (!pausedRef.current) playSection(idx + 1)
        }, 800)
      }
    })
  }, [speakText])

  const startDriveMode = useCallback(() => {
    sectionsRef.current = buildSections(lesson)
    setCurrentSectionIdx(0)
    setIsPlaying(true)
    setIsPaused(false)
    pausedRef.current = false
    announce('🚗 Drive Mode — hands free. Say "pause", "quiz me", or "next lesson" anytime.')
    setTimeout(() => playSection(0), 1000)
  }, [lesson, playSection, announce])

  const handlePause = useCallback(() => {
    audioRef.current?.pause()
    pausedRef.current = true
    setIsPaused(true)
    setIsPlaying(false)
    announce('⏸ Paused. Say "resume" to continue.')
    speakText('Pausing.')
  }, [speakText, announce])

  const handleResume = useCallback(() => {
    audioRef.current?.play()
    pausedRef.current = false
    setIsPaused(false)
    setIsPlaying(true)
    announce(`📖 Resuming — ${sectionsRef.current[currentIdxRef.current]?.label || ''}`)
    speakText('Resuming.')
  }, [speakText, announce])

  const handleRepeat = useCallback(() => {
    announce('🔁 Repeating section...')
    speakText('Repeating.', () => playSection(currentIdxRef.current))
  }, [speakText, playSection, announce])

  const handleFaster = useCallback(() => {
    const newSpeed = Math.min(speedRef.current + 0.25, 2)
    setSpeed(newSpeed)
    speedRef.current = newSpeed
    announce(`⚡ Speed: ${newSpeed}x`)
    speakText(`Speed set to ${newSpeed} times.`, () => playSection(currentIdxRef.current))
  }, [speakText, playSection, announce])

  const handleSlower = useCallback(() => {
    const newSpeed = Math.max(speedRef.current - 0.25, 0.75)
    setSpeed(newSpeed)
    speedRef.current = newSpeed
    announce(`🐢 Speed: ${newSpeed}x`)
    speakText(`Slowing down to ${newSpeed} times.`, () => playSection(currentIdxRef.current))
  }, [speakText, playSection, announce])

  const handleSkip = useCallback(() => {
    announce('⏭ Skipping ahead...')
    speakText('Skipping.', () => playSection(currentIdxRef.current + 1))
  }, [speakText, playSection, announce])

  const handleRecap = useCallback(() => {
    const sections = sectionsRef.current
    const recapIdx = sections.findIndex(s => s.id === 'recap')
    if (recapIdx >= 0) {
      announce('📋 Jumping to recap...')
      speakText('Jumping to recap.', () => playSection(recapIdx))
    }
  }, [speakText, playSection, announce])

  const handleQuiz = useCallback(() => {
    stopAudio()
    setIsPlaying(false)
    speakText('Taking you to the quiz now.', () => {
      onNavigate(`/courses/${courseId}/quiz/${lesson.id}`)
    })
  }, [speakText, courseId, lesson.id, onNavigate])

  const handleNext = useCallback(() => {
    stopAudio()
    setIsPlaying(false)
    speakText('Moving to the next lesson.', () => {
      onNavigate(`/courses/${courseId}`)
    })
  }, [speakText, courseId, onNavigate])

  const handleStop = useCallback(() => {
    stopAudio()
    recognitionRef.current?.stop()
    setIsPlaying(false)
    setIsPaused(false)
    setIsListening(false)
    onClose()
  }, [onClose])

  // Voice command dispatch
  const handleVoiceCommand = useCallback((cmd: string, transcript: string) => {
    setLastCommand(transcript)
    switch (cmd) {
      case 'pause':   handlePause(); break
      case 'resume':  handleResume(); break
      case 'repeat':  handleRepeat(); break
      case 'faster':  handleFaster(); break
      case 'slower':  handleSlower(); break
      case 'skip':    handleSkip(); break
      case 'recap':   handleRecap(); break
      case 'quiz':    handleQuiz(); break
      case 'next':    handleNext(); break
      case 'stop':    handleStop(); break
      case 'back':
        announce('↩ Going back...')
        speakText('Going back.', () => playSection(Math.max(0, currentIdxRef.current - 1)))
        break
    }
  }, [handlePause, handleResume, handleRepeat, handleFaster, handleSlower, handleSkip, handleRecap, handleQuiz, handleNext, handleStop, announce, speakText, playSection])

  // Set up speech recognition
  useEffect(() => {
    if (!voiceEnabled) return
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[e.results.length - 1][0].transcript as string
      const cmd = matchCommand(transcript)
      if (cmd) handleVoiceCommand(cmd, transcript)
    }
    recognition.onend = () => {
      setIsListening(false)
      if (!pausedRef.current) {
        try { recognition.start(); setIsListening(true) } catch {}
      }
    }
    recognition.onerror = () => setIsListening(false)

    try {
      recognition.start()
      setIsListening(true)
      recognitionRef.current = recognition
    } catch {}

    return () => { try { recognition.stop() } catch {} }
  }, [voiceEnabled, handleVoiceCommand])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio()
      try { recognitionRef.current?.stop() } catch {}
    }
  }, [])

  const sections = sectionsRef.current
  const currentSection = sections[currentSectionIdx]

  const s = {
    overlay: {
      position: 'fixed' as const, inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.97)',
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    inner: { maxWidth: '500px', width: '90%', textAlign: 'center' as const },
    icon: { fontSize: '64px', marginBottom: '8px' },
    title: { fontSize: '13px', color: '#64748B', marginBottom: '6px', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    lessonTitle: { fontSize: '22px', fontWeight: 800, color: '#F1F5F9', marginBottom: '24px', lineHeight: 1.3 },
    status: { fontSize: '16px', color: '#FBBF24', marginBottom: '32px', minHeight: '24px', fontWeight: 600 },
    progressBar: { display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '32px' },
    progressDot: (active: boolean, done: boolean) => ({
      width: active ? '32px' : '8px', height: '8px', borderRadius: '4px',
      background: done ? '#4ADE80' : active ? '#FBBF24' : 'rgba(255,255,255,0.15)',
      transition: 'all 0.3s ease',
    }),
    ctaRow: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: '20px' },
    btnPlay: { background: '#FBBF24', color: '#000', border: 'none', borderRadius: '50px', padding: '14px 32px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', minWidth: '160px' },
    btnSecondary: { background: 'rgba(255,255,255,0.07)', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    btnDanger: { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '50px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    voiceRow: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '20px' },
    voiceIndicator: { display: 'flex', alignItems: 'center', gap: '6px', color: isListening ? '#4ADE80' : '#64748B', fontSize: '13px' },
    commands: { fontSize: '12px', color: '#334155', lineHeight: 1.8 },
    speed: { display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' },
    speedBtn: (active: boolean) => ({
      background: active ? 'rgba(251,191,36,0.2)' : 'transparent',
      border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.1)'}`,
      color: active ? '#FBBF24' : '#64748B',
      borderRadius: '20px', padding: '4px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    }),
  }

  return (
    <div style={s.overlay}>
      <div style={s.inner}>
        <div style={s.icon}>🚗</div>
        <div style={s.title}>Drive Mode</div>
        <div style={s.lessonTitle}>{lesson.title}</div>

        {/* Status */}
        <div style={s.status}>{statusMsg}</div>

        {/* Section progress dots */}
        <div style={s.progressBar}>
          {sections.map((sec, i) => (
            <div key={sec.id} style={s.progressDot(i === currentSectionIdx && isPlaying, i < currentSectionIdx)} />
          ))}
        </div>

        {/* Speed control */}
        <div style={s.speed}>
          <span style={{ fontSize: '11px', color: '#64748B' }}>SPEED</span>
          {[0.75, 1, 1.25, 1.5, 2].map(sp => (
            <button key={sp} style={s.speedBtn(speed === sp)} onClick={() => {
              setSpeed(sp); speedRef.current = sp
              if (isPlaying) { speakText(`Speed ${sp}.`, () => playSection(currentSectionIdx)) }
            }}>
              {sp}x
            </button>
          ))}
        </div>

        {/* Main controls */}
        <div style={s.ctaRow}>
          {!isPlaying && !isPaused && (
            <button style={s.btnPlay} onClick={startDriveMode}>▶ Start Lesson</button>
          )}
          {isPlaying && (
            <button style={s.btnPlay} onClick={handlePause}>⏸ Pause</button>
          )}
          {isPaused && (
            <button style={s.btnPlay} onClick={handleResume}>▶ Resume</button>
          )}
          {(isPlaying || isPaused) && (
            <>
              <button style={s.btnSecondary} onClick={handleRepeat}>🔁 Repeat</button>
              <button style={s.btnSecondary} onClick={handleSkip}>⏭ Skip</button>
              <button style={s.btnSecondary} onClick={handleRecap}>📋 Recap</button>
            </>
          )}
        </div>

        <div style={s.ctaRow}>
          <button style={s.btnSecondary} onClick={handleQuiz}>🧪 Quiz Me</button>
          <button style={s.btnSecondary} onClick={handleNext}>Next Lesson →</button>
          <button style={s.btnDanger} onClick={handleStop}>✕ Exit</button>
        </div>

        {/* Voice controls toggle */}
        <div style={s.voiceRow}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <div
              onClick={() => setVoiceEnabled(v => !v)}
              style={{
                width: '36px', height: '20px', borderRadius: '10px',
                background: voiceEnabled ? '#4ADE80' : 'rgba(255,255,255,0.1)',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px', left: voiceEnabled ? '18px' : '2px',
                width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s',
              }} />
            </div>
            <span style={s.voiceIndicator}>
              {voiceEnabled ? (isListening ? '🎤 Listening...' : '🎤 Voice On') : '🎤 Voice Commands Off'}
            </span>
          </label>
        </div>

        {voiceEnabled && (
          <div style={s.commands}>
            {lastCommand && <div style={{ color: '#64748B', marginBottom: '8px' }}>Heard: "{lastCommand}"</div>}
            Say: <span style={{ color: '#475569' }}>"pause" · "resume" · "speed up" · "slow down" · "repeat" · "skip" · "recap" · "quiz me" · "next lesson" · "stop"</span>
          </div>
        )}
      </div>
    </div>
  )
}
