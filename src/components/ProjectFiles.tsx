'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveFileRecord, deleteFile } from '@/lib/actions/files'

const BUCKET = 'project-files'
const MAX_SIZE_MB = 50

interface ProjectFile {
  id: string
  name: string
  url: string
  storage_path: string
  size: number
  type: string
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string) {
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
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Max size is ${MAX_SIZE_MB} MB.`)
      return
    }

    setUploading(true)
    setUploadError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type })

    if (storageError) {
      setUploadError(storageError.message)
      setUploading(false)
      return
    }

    try {
      await saveFileRecord(projectId, file.name, path, file.size, file.type)

      // Optimistic update
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      setFiles((prev) => [
        {
          id: Date.now().toString(),
          name: file.name,
          url: data.publicUrl,
          storage_path: path,
          size: file.size,
          type: file.type,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to save file record')
    }

    setUploading(false)
    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ''
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
          marginBottom: '16px',
          transition: 'all 0.15s ease',
        }}
      >
        {uploading ? 'Uploading…' : '↑ Upload File'}
      </label>

      {uploadError && (
        <p style={{ margin: '-8px 0 12px 0', fontSize: '12px', color: '#ef4444' }}>{uploadError}</p>
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
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{fileIcon(file.type)}</span>
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
                  {formatBytes(file.size)} ·{' '}
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
