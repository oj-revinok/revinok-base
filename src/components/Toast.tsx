'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useTheme } from '@/context/ThemeContext'

interface ToastMessage {
  id: string
  text: string
  type: 'error' | 'success' | 'info'
}

interface ToastContextType {
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const { colors } = useTheme()

  const showToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, text, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
            colors={colors}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onDismiss,
  colors,
}: {
  toast: ToastMessage
  onDismiss: () => void
  colors: Record<string, string>
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true))
    // Auto dismiss after 4s
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const bgColor =
    toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#22c55e' : colors.accent

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: '#fff',
        padding: '10px 16px',
        borderRadius: 12,
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'Montserrat, sans-serif',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        maxWidth: 320,
      }}
      onClick={() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }}
    >
      {toast.text}
    </div>
  )
}
