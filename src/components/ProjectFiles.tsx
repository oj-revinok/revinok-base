'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { uploadFile, deleteFile } from '@/lib/actions/files'
import { useTheme } from '@/context/ThemeContext'

interface ProjectFile {
  id: string
  name: string
  url: string
  storage_path: string
  size_bytes: number | null
  file_type: string | null
  created_at: string
  is_launch_checklist?: boolean
}

interface ChecklistData {
  projectName?: string
  reviewedBy?: string
  sentAt?: string
  progress?: { done: number; total: number }
  items?: { id: string; sectionNum: string; section: string; title: string; done: boolean }[]
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// SVG file type indicator (no emojis)
function FileTypeTag({ mimeType }: { mimeType: string | null }) {
  const { colors } = useTheme()
  let label = 'FILE'
  let color = colors.textMuted
  if (mimeType === 'checklist') { label = 'CHKLST'; color = colors.accent }
  else if (mimeType?.startsWith('image/')) { label = 'IMG'; color = '#4a9eff' }
  else if (mimeType === 'application/pdf') { label = 'PDF'; color = '#ef4444' }
  else if (mimeType?.includes('word') || mimeType?.includes('document')) { label = 'DOC'; color = '#4a9eff' }
  else if (mimeType?.includes('sheet') || mimeType?.includes('excel')) { label = 'XLS'; color = '#4ade80' }
  else if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) { label = 'PPT'; color = '#ff9d4a' }
  else if (mimeType?.includes('zip')) { label = 'ZIP'; color = '#a78bfa' }
  return (
    <span style={{
      fontSize: '8px', fontWeight: 800, color, backgroundColor: colors.bgTertiary,
      border: `1px solid ${color}33`, padding: '3px 5px', letterSpacing: '0.5px',
      flexShrink: 0, fontFamily: 'Montserrat, sans-serif',
    }}>
      {label}
    </span>
  )
}

async function parseChecklistFromUrl(url: string): Promise<ChecklistData> {
  if (url.startsWith('data:')) {
    const [header, data] = url.split(',')
    const isBase64 = header.includes('base64')
    const text = isBase64 ? atob(data) : decodeURIComponent(data)
    return JSON.parse(text)
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load checklist')
  return res.json()
}

export default function ProjectFiles({
  projectId,
  initialFiles,
  canDelete = true,
  onDelete,
}: {
  projectId: string
  initialFiles: ProjectFile[]
  canDelete?: boolean
  onDelete?: (fileId: string) => void
}) {
  const { colors } = useTheme()
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [checklistModal, setChecklistModal] = useState<{ fileName: string; data: ChecklistData } | null>(null)
  const [loadingChecklist, setLoadingChecklist] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (uploading) {
      setUploadProgress(0)
      progressRef.current = setInterval(() => {
        setUploadProgress((p) => {
          if (p >= 90) return p
          return p + (90 - p) * 0.08
        })
      }, 120)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [uploading])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)
      const result = await uploadFile(formData)
      setUploadProgress(100)
      setFiles((prev) => [{
        id: Date.now().toString(), name: result.name, url: result.publicUrl,
        storage_path: result.path, size_bytes: result.size,
        file_type: result.type, created_at: new Date().toISOString(),
      }, ...prev])
      setUploadSuccess(`"${result.name}" uploaded`)
      setTimeout(() => setUploadSuccess(null), 4000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDelete(file: ProjectFile) {
    if (!confirm(`Delete "${file.name}"?`)) return
    setDeletingId(file.id)
    startTransition(async () => {
      try {
        await deleteFile(projectId, file.id, file.storage_path)
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
      } catch {
        setUploadError('Failed to delete file')
      } finally {
        setDeletingId(null)
      }
    })
  }

  async function handleChecklistClick(file: ProjectFile) {
    setLoadingChecklist(file.id)
    try {
      const data = await parseChecklistFromUrl(file.url)
      setChecklistModal({ fileName: file.name, data })
    } catch {
      setUploadError('Could not load checklist data')
    } finally {
      setLoadingChecklist(null)
    }
  }

  // Helper to get file extension
  function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  // Helper to check if file is an image
  function isImageFile(filename: string, mimeType: string | null): boolean {
    const ext = getFileExtension(filename)
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    return imageExts.includes(ext) || (mimeType?.startsWith('image/') ?? false)
  }

  // Helper to check if file is a PDF
  function isPdfFile(filename: string, mimeType: string | null): boolean {
    const ext = getFileExtension(filename)
    return ext === 'pdf' || mimeType === 'application/pdf'
  }

  return (
    <div>
      {/* Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={handleUpload}
        style={{ display: 'none' }}
        id={`file-upload-${projectId}`}
        disabled={uploading}
      />
      <label
        htmlFor={`file-upload-${projectId}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px',
          backgroundColor: uploading ? colors.bgTertiary : 'transparent',
          color: uploading ? colors.textMuted : colors.accent,
          border: '1px solid', borderColor: uploading ? colors.bgTertiary : colors.accent,
          fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' as const,
          letterSpacing: '0.5px', cursor: uploading ? 'not-allowed' : 'pointer',
          fontFamily: 'Montserrat, sans-serif', minHeight: '44px', borderRadius: 10000,
          marginBottom: uploading ? '0' : '16px', transition: 'all 0.15s ease',
        }}
      >
        {uploading ? 'Uploading…' : '↑ Upload File'}
      </label>

      {uploading && (
        <div style={{ marginBottom: '16px', marginTop: '10px' }}>
          <div style={{ height: '2px', backgroundColor: colors.bgTertiary, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: colors.accent, transition: 'width 0.12s ease' }} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: colors.textMuted }}>{Math.round(uploadProgress)}%</p>
        </div>
      )}

      {uploadSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', padding: '10px 14px', backgroundColor: '#071a0c', border: '1px solid #1a3a1a', fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4.5L4 7.5L11 1" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {uploadSuccess}
        </div>
      )}

      {uploadError && (
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444' }}>{uploadError}</p>
      )}

      {files.length === 0 ? (
        <p style={{ color: colors.textMuted, fontSize: '13px', margin: 0 }}>No files yet. Upload a PDF, image, or doc.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {files.map((file) => {
            const hasImagePreview = isImageFile(file.name, file.file_type)
            const hasPdfPreview = isPdfFile(file.name, file.file_type)

            return (
              <div
                key={file.id}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  padding: '12px 14px', backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {/* Preview section for images and PDFs */}
                {hasImagePreview && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        style={{
                          maxWidth: '200px',
                          maxHeight: '150px',
                          objectFit: 'cover',
                          borderRadius: '12px',
                          border: `1px solid ${colors.border}`,
                          cursor: 'pointer',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.8' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '1' }}
                      />
                    </a>
                  </div>
                )}

                {hasPdfPreview && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '80px', height: '100px', flexShrink: 0,
                      backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`,
                      borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', gap: '4px',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>PDF</span>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', padding: '8px 12px',
                        backgroundColor: colors.bgTertiary, border: `1px solid ${colors.border}`,
                        borderRadius: '8px', color: colors.accent, textDecoration: 'none',
                        fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.bgHover }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.bgTertiary }}
                    >
                      Preview
                    </a>
                  </div>
                )}

                {/* File info and controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileTypeTag mimeType={file.is_launch_checklist ? 'checklist' : file.file_type} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {file.is_launch_checklist ? (
                      <button
                        onClick={() => handleChecklistClick(file)}
                        disabled={loadingChecklist === file.id}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: 'none', border: 'none', padding: 0,
                          color: colors.accent, fontSize: '13px', fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {loadingChecklist === file.id ? 'Loading…' : file.name}
                      </button>
                    ) : (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block', color: colors.text, fontSize: '13px', fontWeight: 600,
                          textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </a>
                    )}
                    <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: colors.textMuted }}>
                      {file.size_bytes ? formatBytes(file.size_bytes) : '—'}
                      {' · '}
                      {new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {file.is_launch_checklist && <span style={{ color: colors.accent, marginLeft: '6px', fontWeight: 700 }}>Go-Live Checklist</span>}
                    </p>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => onDelete ? onDelete(file.id) : handleDelete(file)}
                      disabled={deletingId === file.id}
                      style={{
                        background: 'none', border: 'none', color: colors.borderLight, fontSize: '16px',
                        cursor: 'pointer', padding: '8px', minHeight: '44px', minWidth: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontFamily: 'Montserrat, sans-serif',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = colors.borderLight }}
                      title="Delete file"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Checklist view modal */}
      {checklistModal && (
        <ChecklistViewModal
          fileName={checklistModal.fileName}
          data={checklistModal.data}
          onClose={() => setChecklistModal(null)}
        />
      )}
    </div>
  )
}

/* ── Checklist View Modal ──────────────────────────────── */

function ChecklistViewModal({
  fileName,
  data,
  onClose,
}: {
  fileName: string
  data: ChecklistData
  onClose: () => void
}) {
  const { colors, theme } = useTheme()
  const items = data.items ?? []
  const progress = data.progress ?? { done: items.filter(i => i.done).length, total: items.length }
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  // Group by section
  const sections: Record<string, typeof items> = {}
  items.forEach(item => {
    const key = `${item.sectionNum}|${item.section}`
    if (!sections[key]) sections[key] = []
    sections[key].push(item)
  })

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay,
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: colors.bgSecondary, border: `1px solid ${colors.bgHover}`,
        width: '100%', maxWidth: '680px', maxHeight: '90vh',
        overflowY: 'auto', display: 'flex', flexDirection: 'column', borderRadius: 12,
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: `1px solid ${colors.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px',
          position: 'sticky', top: 0, backgroundColor: colors.bgSecondary, zIndex: 1,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Go-Live Checklist
            </p>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: colors.text, lineHeight: 1.3 }}>
              {data.projectName || fileName}
            </h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {data.reviewedBy && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  Submitted by <span style={{ color: colors.textSecondary }}>{data.reviewedBy}</span>
                </span>
              )}
              {data.sentAt && (
                <span style={{ fontSize: '11px', color: colors.textMuted }}>
                  {new Date(data.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${colors.bgHover}`, color: colors.textMuted,
              fontSize: '14px', cursor: 'pointer', padding: '6px 10px', lineHeight: 1,
              fontFamily: 'Montserrat, sans-serif', flexShrink: 0, borderRadius: 10000, fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div style={{ padding: '16px 28px', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgTertiary }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {progress.done} / {progress.total} completed
            </span>
            <span style={{
              fontSize: '12px', fontWeight: 700,
              color: pct === 100 ? '#4ade80' : pct >= 80 ? colors.accent : '#ff9d4a',
            }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: '4px', backgroundColor: colors.border, overflow: 'hidden' }}>
            <div style={{
              height: '100%', transition: 'width 0.4s ease',
              backgroundColor: pct === 100 ? '#4ade80' : colors.accent,
              width: `${pct}%`,
            }} />
          </div>
        </div>

        {/* Sections */}
        <div style={{ padding: '8px 0 24px' }}>
          {Object.entries(sections).map(([key, sectionItems]) => {
            const [sectionNum, sectionName] = key.split('|')
            const doneSec = sectionItems.filter(i => i.done).length
            return (
              <div key={key} style={{ marginBottom: '2px' }}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 28px', backgroundColor: colors.bgTertiary,
                  borderTop: `1px solid ${colors.bgSecondary}`, borderBottom: `1px solid ${colors.bgSecondary}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, color: colors.textMuted,
                      backgroundColor: colors.border, padding: '3px 7px', letterSpacing: '0.5px',
                      fontFamily: 'Montserrat, sans-serif', flexShrink: 0,
                    }}>
                      {sectionNum}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {sectionName}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '10px', color: doneSec === sectionItems.length ? '#4ade80' : colors.textMuted,
                    fontWeight: 600,
                  }}>
                    {doneSec}/{sectionItems.length}
                  </span>
                </div>

                {/* Items */}
                {sectionItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 28px', borderBottom: `1px solid ${colors.bgTertiary}`,
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: '14px', height: '14px', flexShrink: 0,
                      border: `1.5px solid ${item.done ? '#4ade80' : colors.bgHover}`,
                      backgroundColor: item.done ? '#4ade80' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.done && (
                        <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                          <path d="M1 2.5L2.5 4L6 1" stroke={theme === 'dark' ? '#080808' : '#ffffff'} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px', lineHeight: 1.5, flex: 1,
                      color: item.done ? colors.textMuted : colors.textSecondary,
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
