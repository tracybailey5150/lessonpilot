'use client'

import { useState, useRef } from 'react'

export const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', style: 'Calm & Professional' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',   style: 'Strong & Confident' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',  style: 'Warm & Friendly' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', style: 'Authoritative' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',   style: 'Energetic' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   style: 'Deep & Conversational' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', style: 'Bold' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   style: 'Neutral & Clear' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',    style: 'Raspy' },
]

export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // Rachel

interface VoiceSelectorProps {
  selectedVoiceId: string
  onSelect: (voiceId: string) => void
  compact?: boolean
}

export default function VoiceSelector({ selectedVoiceId, onSelect, compact = false }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const selected = VOICES.find(v => v.id === selectedVoiceId) || VOICES[0]

  const previewVoice = async (voiceId: string) => {
    if (previewing === voiceId) {
      audioRef.current?.pause()
      if (audioRef.current?.src?.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src)
      setPreviewing(null)
      return
    }
    setPreviewing(voiceId)
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        if (audioRef.current.src?.startsWith('blob:')) URL.revokeObjectURL(audioRef.current.src)
      }

      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "Hi, I'm your AI instructor. I'll be teaching your course today.", voiceId }),
      })

      if (!res.ok) { setPreviewing(null); return }

      // Use Blob URL — works on iOS Safari, Chrome, Firefox, all browsers
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const audio = new Audio(blobUrl)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(blobUrl)
        setPreviewing(null)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        setPreviewing(null)
      }
      // play() returns a Promise — must await/catch for iOS
      try {
        await audio.play()
      } catch {
        URL.revokeObjectURL(blobUrl)
        setPreviewing(null)
      }
    } catch {
      setPreviewing(null)
    }
  }

  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
            color: '#FBBF24', borderRadius: '8px', padding: '8px 14px', fontSize: '13px',
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          🎙️ {selected.name} <span style={{ fontSize: '10px' }}>▼</span>
        </button>
        {open && (
          <div style={{
            position: 'absolute', bottom: '110%', left: 0, zIndex: 1000, minWidth: '220px',
            background: '#0C1220', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {VOICES.map(v => (
              <div
                key={v.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: v.id === selectedVoiceId ? 'rgba(251,191,36,0.08)' : 'transparent',
                }}
                onClick={() => { onSelect(v.id); setOpen(false) }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: v.id === selectedVoiceId ? '#FBBF24' : '#F1F5F9' }}>{v.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{v.style}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); previewVoice(v.id) }}
                  style={{ background: 'none', border: 'none', color: previewing === v.id ? '#FBBF24' : '#64748B', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                >
                  {previewing === v.id ? '⏸' : '▶'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        🎙️ Learning Voice
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {VOICES.map(v => (
          <div
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              background: v.id === selectedVoiceId ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${v.id === selectedVoiceId ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '10px', cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: v.id === selectedVoiceId ? '#FBBF24' : '#F1F5F9' }}>
                {v.name} {v.id === selectedVoiceId && '✓'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>{v.style}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); previewVoice(v.id) }}
              style={{
                background: previewing === v.id ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: previewing === v.id ? '#FBBF24' : '#94A3B8',
                borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 600,
              }}
            >
              {previewing === v.id ? '⏸ Stop' : '▶ Preview'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
