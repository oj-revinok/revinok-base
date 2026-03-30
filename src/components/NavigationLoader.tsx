'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

export default function NavigationLoader() {
  const pathname = usePathname()
  const { colors } = useTheme()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const prevPathRef = useRef(pathname)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  const startLoading = useCallback(() => {
    setLoading(true)
    setProgress(20)

    // Simulate progress
    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 15
      })
    }, 200)
  }, [])

  const stopLoading = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(100)
    timerRef.current = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 300)
  }, [])

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      stopLoading()
      prevPathRef.current = pathname
    }
  }, [pathname, stopLoading])

  // Intercept link clicks to start loading
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return
      if (href !== pathname) {
        startLoading()
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, startLoading])

  if (!loading && progress === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          backgroundColor: colors.accent,
          width: `${progress}%`,
          transition: progress === 100 ? 'width 0.2s ease, opacity 0.3s ease' : 'width 0.4s ease',
          opacity: progress === 100 ? 0 : 1,
          boxShadow: `0 0 8px ${colors.accent}40`,
        }}
      />
    </div>
  )
}
