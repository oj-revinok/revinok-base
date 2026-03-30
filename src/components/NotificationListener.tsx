'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './Toast'

interface NotificationListenerProps {
  currentUserId: string
  currentUserName: string
}

/**
 * Global notification listener that runs at the dashboard layout level.
 * Subscribes to real-time message INSERTs and fires browser notifications
 * when a new message arrives from someone else, regardless of which page you're on.
 */
export default function NotificationListener({ currentUserId, currentUserName }: NotificationListenerProps) {
  const supabaseClient = createClient()
  const permissionRef = useRef(false)
  const { showToast } = useToast()

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        permissionRef.current = true
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          permissionRef.current = perm === 'granted'
        })
      }
    }
  }, [])

  // Subscribe to all incoming messages for this user
  useEffect(() => {
    const channel = supabaseClient
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newMsg = payload.new as { sender_id: string; content: string | null; receiver_id: string }

          // Don't notify for own messages
          if (newMsg.sender_id === currentUserId) return

          // Try to get sender name from the message or use a fallback
          let senderName = 'New message'
          try {
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('full_name')
              .eq('id', newMsg.sender_id)
              .single()
            if (profile?.full_name) senderName = profile.full_name
          } catch {
            // Use fallback name
          }

          const content = newMsg.content || 'Sent a file'

          // Fire browser notification if tab is not focused
          if (!document.hasFocus() && permissionRef.current) {
            try {
              new Notification(senderName, {
                body: content,
                icon: '/favicon.ico',
                tag: `revinok-msg-${newMsg.sender_id}`,
              })
            } catch {
              // Notification may fail in some environments
            }
          }

          // Also show an in-app toast if not on the messages page
          if (!window.location.pathname.includes('/messages')) {
            showToast(`${senderName}: ${content.slice(0, 50)}${content.length > 50 ? '…' : ''}`, 'info')
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [currentUserId, supabaseClient, showToast])

  return null
}
