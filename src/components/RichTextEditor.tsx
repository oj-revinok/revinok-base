'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useTheme } from '@/context/ThemeContext'
import { useRef, useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing…',
  editable = true,
}: RichTextEditorProps) {
  const { colors, theme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Underline,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-editor-image',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editable,
  })

  if (!editor) return null

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith('image/')) return

    setUploading(true)
    try {
      // Convert to base64 for inline embedding
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        editor.chain().focus().setImage({ src: base64 }).run()
      }
      reader.readAsDataURL(file)
    } finally {
      setUploading(false)
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const toolbarBtnStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '6px 10px',
    backgroundColor: isActive ? colors.accent : colors.bgSecondary,
    border: `1px solid ${isActive ? colors.accent : colors.bgTertiary}`,
    color: isActive ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textSecondary,
    borderRadius: 10000,
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'Montserrat, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    minHeight: '32px',
    transition: 'all 0.15s',
  })

  return (
    <div className="tiptap-editor" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Toolbar */}
      {editable && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '12px',
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.bgTertiary}`,
            borderRadius: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Bold */}
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            style={toolbarBtnStyle(editor.isActive('bold'))}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          {/* Italic */}
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            style={toolbarBtnStyle(editor.isActive('italic'))}
            title="Italic"
          >
            <em>I</em>
          </button>

          {/* Underline */}
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run()}
            style={toolbarBtnStyle(editor.isActive('underline'))}
            title="Underline"
          >
            <u>U</u>
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: colors.bgTertiary, margin: '0 4px' }} />

          {/* H1 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            style={toolbarBtnStyle(editor.isActive('heading', { level: 1 }))}
            title="Heading 1"
          >
            H1
          </button>

          {/* H2 */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            style={toolbarBtnStyle(editor.isActive('heading', { level: 2 }))}
            title="Heading 2"
          >
            H2
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: colors.bgTertiary, margin: '0 4px' }} />

          {/* Bullet List */}
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            style={toolbarBtnStyle(editor.isActive('bulletList'))}
            title="Bullet list"
          >
            •
          </button>

          {/* Ordered List */}
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            style={toolbarBtnStyle(editor.isActive('orderedList'))}
            title="Ordered list"
          >
            1.
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: colors.bgTertiary, margin: '0 4px' }} />

          {/* Link */}
          <button
            onClick={() => {
              const url = window.prompt('URL')
              if (url) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
              }
            }}
            style={toolbarBtnStyle(editor.isActive('link'))}
            title="Add link"
          >
            🔗
          </button>

          {/* Image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              ...toolbarBtnStyle(false),
              opacity: uploading ? 0.6 : 1,
            }}
            title="Insert image"
          >
            {uploading ? '…' : '🖼'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{
          flex: 1,
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.bgTertiary}`,
          borderRadius: '8px',
          overflow: 'auto',
        }}
      />
    </div>
  )
}
