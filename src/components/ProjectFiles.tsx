'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { uploadFile, deleteFile } from '@/lib/actions/files'

interface ProjectFile {
  id: string
  name: string
  url: string
  storage_path: string
  size_bytes: number | null
  file_type: string | null
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string | null) {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📎'
}

export default function ProjectFiles({
  projectId,
  initialFiles,
}: {
  projectId: string
  initialFiles: ProjectFile[]
}) {
  const [files, setFiles] = useState<ProjectFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [, startTransition] = useTransition()

  // Animate progress bar while uploading
  useEffect(() => {
    if (uploading) {
      setProgress(0)
      progressRef.current = setInterval(() => {
        setProgress((p) => {
          // Ease toward 90% — never reaches 100 until done
          if (p >= 90) return p
          return p + (90 - p) * 0.08
        })
      }, 120)
    } else {
      if (progressRef.current) clearInterval(progressRef.current)
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
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

      // Snap to 100%
      setProgress(100)

      setFiles((prev) => [
        {
          id: Date.now().toString(),
          name: result.name,
          url: result.publicUrl,
          storage_path: result.path,
          size_bytes: result.size,
          file_type: result.type,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])

      setUploadSuccess(`"${result.name}" uploaded successfully`)
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

  return (
    <div>
      {/* Upload button */}
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
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          backgroundColor: uploading ? '#2a2a2a' : 'transparent',
          color: uploading ? '#555555' : '#BDD630',
          border: '1px solid',
          borderColor: uploading ? '#2a2a2a' : '#BDD630',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.5px',
          cursor: uploading ? 'not-allowed' : 'pointer',
          fontFamily: 'Montserrat, sans-serif',
          minHeight: '44px',
          marginBottom: uploading ? '0' : '16px',
          transition: 'all 0.15s ease',
        }}
      >
        {uploading ? 'Uploading…' : '↑ Upload File'}
      </label>

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginBottom: '16px', marginTop: '10px' }}>
          <div style={{ height: '3px', backgroundColor: '#1a1a1a', width: '100%', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: '#BDD630',
                transition: 'width 0.12s ease',
              }}
            />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#555555' }}>
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Success message */}
      {uploadSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: '0 0 16px 0',
          padding: '10px 14px',
          backgroundColor: '#0d1f0d',
          border: '1px solid #1a3a1a',
          fontSize: '12px',
          color: '#4ade80',
          fontWeight: 600,
        }}>
          <span>✓</span>
          {uploadSuccess}
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#ef4444' }}>{uploadError}</p>
      )}

      {files.length === 0 ? (
        <p style={{ color: '#555555', fontSize: '13px', margin: 0 }}>No files yet. Upload a PDF, image, or doc.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#111111',
                border: '1px solid #1a1a1a',
                minHeight: '52px',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{fileIcon(file.file_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </a>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555555' }}>
                  {file.size_bytes ? formatBytes(file.size_bytes) : '—'} ·{' '}
                  {new Date(file.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => handleDelete(file)}
                disabled={deletingId === file.id}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#555555',
                  fontSize: '16px',
                  cursor: 'pointer',
                  padding: '8px',
                  minHeight: '44px',
                  minWidth: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'Montserrat, sans-serif',
                }}
                title="Delete file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
