'use client'

import { useEffect, useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Resource {
  id: string
  course_id: string
  lesson_id: string | null
  type: string
  name: string
  url: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  created_at: string
}

interface Course {
  id: string
  title: string
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function isYouTubeUrl(url: string): boolean {
  return !!getYouTubeId(url)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'pdf': return '📄'
    case 'audio': return '🎵'
    case 'video': return '🎬'
    case 'zip': return '🗜️'
    case 'youtube': return '▶️'
    case 'url': return '🔗'
    default: return '📎'
  }
}

function detectTypeFromMime(mime: string): string {
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return 'zip'
  return 'file'
}

function detectTypeFromExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'pdf'
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio'
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return 'video'
  if (['zip', 'tar', 'gz', '7z'].includes(ext)) return 'zip'
  return 'file'
}

export default function ResourcesPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState('')
  const [urlPreview, setUrlPreview] = useState<{ isYoutube: boolean; ytId?: string } | null>(null)
  const [addingUrl, setAddingUrl] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)

      const { data: courseData } = await supabase.from('courses').select('id, title').eq('id', courseId).single()
      setCourse(courseData)

      await fetchResources(session.access_token)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, router])

  const fetchResources = useCallback(async (tok: string) => {
    const res = await fetch(`/api/resources?courseId=${courseId}`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      const data = await res.json()
      setResources(data.resources || [])
    }
  }, [courseId])

  const handleUrlChange = (val: string) => {
    setUrlInput(val)
    if (val.trim()) {
      const isYt = isYouTubeUrl(val)
      setUrlPreview({ isYoutube: isYt, ytId: isYt ? getYouTubeId(val)! : undefined })
    } else {
      setUrlPreview(null)
    }
  }

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !token) return
    setAddingUrl(true)
    const isYt = isYouTubeUrl(urlInput)
    const type = isYt ? 'youtube' : 'url'
    const name = isYt ? `YouTube: ${urlInput}` : getDomain(urlInput)

    const res = await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ courseId, type, name, url: urlInput }),
    })
    if (res.ok) {
      await fetchResources(token)
      setUrlInput('')
      setUrlPreview(null)
    }
    setAddingUrl(false)
  }

  const handleFiles = async (files: FileList | File[]) => {
    if (!token) return
    setUploading(true)
    const arr = Array.from(files)
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      setUploadProgress(`Uploading ${file.name} (${i + 1}/${arr.length})...`)

      // Upload file
      const fd = new FormData()
      fd.append('file', file)
      fd.append('courseId', courseId)

      const uploadRes = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!uploadRes.ok) {
        setUploadProgress(`Failed to upload ${file.name}`)
        continue
      }
      const { url, path, size, mimeType } = await uploadRes.json()

      // Detect type
      const type = detectTypeFromMime(mimeType) !== 'file'
        ? detectTypeFromMime(mimeType)
        : detectTypeFromExt(file.name)

      // Save record
      await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          courseId,
          type,
          name: file.name,
          url,
          filePath: path,
          fileSize: size,
          mimeType,
        }),
      })
    }
    setUploadProgress('')
    setUploading(false)
    await fetchResources(token)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!token) return
    if (!confirm('Delete this resource?')) return
    await fetch(`/api/resources?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setResources(prev => prev.filter(r => r.id !== id))
  }

  const s = {
    page: { background: '#070C18', minHeight: '100vh', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#F1F5F9' } as React.CSSProperties,
    header: { background: '#0C1220', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
    main: { maxWidth: '900px', margin: '0 auto', padding: '40px 32px' } as React.CSSProperties,
    pageTitle: { fontSize: '28px', fontWeight: 800, marginBottom: '8px' } as React.CSSProperties,
    subtitle: { color: '#64748B', fontSize: '14px', marginBottom: '32px' } as React.CSSProperties,
    section: { background: '#0C1220', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '24px', marginBottom: '24px' } as React.CSSProperties,
    sectionTitle: { fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: '#F1F5F9' } as React.CSSProperties,
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', color: '#F1F5F9', fontSize: '14px', flex: 1, outline: 'none' } as React.CSSProperties,
    btn: { background: '#38BDF8', color: '#070C18', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' } as React.CSSProperties,
    btnDisabled: { background: 'rgba(56,189,248,0.4)', color: '#070C18', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'not-allowed' } as React.CSSProperties,
    dropZone: { border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '40px 20px', textAlign: 'center' as const, cursor: 'pointer', transition: 'all 0.2s' } as React.CSSProperties,
    dropZoneActive: { border: '2px dashed #38BDF8', background: 'rgba(56,189,248,0.05)', borderRadius: '10px', padding: '40px 20px', textAlign: 'center' as const, cursor: 'pointer' } as React.CSSProperties,
    resourceCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' } as React.CSSProperties,
    deleteBtn: { background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    openBtn: { background: 'rgba(56,189,248,0.1)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', flexShrink: 0 } as React.CSSProperties,
    emptyState: { textAlign: 'center' as const, padding: '60px 20px', color: '#64748B' } as React.CSSProperties,
    tabBar: { display: 'flex', gap: '4px', marginBottom: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '4px', width: 'fit-content' } as React.CSSProperties,
    tab: { padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', color: '#64748B' } as React.CSSProperties,
    tabActive: { padding: '8px 18px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', color: '#F1F5F9', background: '#0C1220' } as React.CSSProperties,
  }

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#64748B' }}>Loading resources...</div>
    </div>
  )

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/dashboard" style={{ color: '#F1F5F9', textDecoration: 'none', fontSize: '18px', fontWeight: 700 }}>🎓 LessonPilot</Link>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}>Dashboard</Link>
          <Link href={`/courses/${courseId}`} style={{ color: '#64748B', fontSize: '14px', textDecoration: 'none' }}>← Course</Link>
        </div>
      </header>

      <main style={s.main}>
        <h1 style={s.pageTitle}>Course Resources</h1>
        {course && <p style={s.subtitle}>{course.title}</p>}

        {/* Tab bar */}
        <div style={s.tabBar}>
          <Link href={`/courses/${courseId}`} style={s.tab}>Lessons</Link>
          <Link href={`/courses/${courseId}/resources`} style={s.tabActive}>Resources</Link>
          <Link href={`/courses/${courseId}/progress`} style={s.tab}>Progress</Link>
        </div>

        {/* URL/Link section */}
        <div style={s.section}>
          <div style={s.sectionTitle}>🔗 Add URL or Link</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              style={s.input}
              type="url"
              placeholder="Paste a URL (YouTube, article, any link...)"
              value={urlInput}
              onChange={e => handleUrlChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddUrl() }}
            />
            <button
              style={addingUrl ? s.btnDisabled : s.btn}
              onClick={handleAddUrl}
              disabled={addingUrl || !urlInput.trim()}
            >
              {addingUrl ? 'Adding...' : 'Add Link'}
            </button>
          </div>

          {/* YouTube preview */}
          {urlPreview?.isYoutube && urlPreview.ytId && (
            <div style={{ marginTop: '14px', display: 'flex', gap: '14px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
              <img
                src={`https://img.youtube.com/vi/${urlPreview.ytId}/mqdefault.jpg`}
                alt="YouTube thumbnail"
                style={{ width: '120px', borderRadius: '6px', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#38BDF8' }}>▶️ YouTube Video</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', wordBreak: 'break-all' }}>{urlInput}</div>
              </div>
            </div>
          )}

          {urlPreview && !urlPreview.isYoutube && urlInput && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔗</span>
              <span>{getDomain(urlInput)}</span>
            </div>
          )}
        </div>

        {/* File upload section */}
        <div style={s.section}>
          <div style={s.sectionTitle}>📁 Upload Files</div>
          <div
            style={dragging ? s.dropZoneActive : s.dropZone}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>☁️</div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: dragging ? '#38BDF8' : '#F1F5F9' }}>
              {dragging ? 'Drop to upload' : 'Drop files here or click to browse'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              PDF, MP3, WAV, MP4, ZIP, PNG, JPG, TXT, MD
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.mp3,.wav,.mp4,.zip,.png,.jpg,.jpeg,.txt,.md"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          {uploading && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(56,189,248,0.08)', borderRadius: '8px', fontSize: '13px', color: '#38BDF8' }}>
              ⏳ {uploadProgress}
            </div>
          )}
        </div>

        {/* Resources grid */}
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            All Resources {resources.length > 0 && <span style={{ color: '#64748B', fontWeight: 400, fontSize: '14px' }}>({resources.length})</span>}
          </div>

          {resources.length === 0 ? (
            <div style={s.emptyState}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📂</div>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No resources yet</div>
              <div style={{ fontSize: '14px' }}>Add files or links above</div>
            </div>
          ) : (
            <div>
              {resources.map(r => (
                <div key={r.id} style={s.resourceCard}>
                  {/* YouTube thumbnail or icon */}
                  {r.type === 'youtube' && r.url && getYouTubeId(r.url) ? (
                    <img
                      src={`https://img.youtube.com/vi/${getYouTubeId(r.url)}/mqdefault.jpg`}
                      alt=""
                      style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ fontSize: '28px', flexShrink: 0, width: '40px', textAlign: 'center' as const }}>
                      {getTypeIcon(r.type)}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {r.file_size ? formatBytes(r.file_size) : r.url ? getDomain(r.url) : r.type}
                      {' · '}
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={s.openBtn}
                      >
                        {r.type === 'youtube' ? '▶ Watch' : r.file_path ? '⬇ Download' : '→ Open'}
                      </a>
                    )}
                    <button style={s.deleteBtn} onClick={() => handleDelete(r.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
