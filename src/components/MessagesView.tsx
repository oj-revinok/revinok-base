'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'
import {
  getMessages,
  sendMessage,
  softDeleteMessage,
  getConversations,
} from '@/lib/actions/messages'
import type { Message, Conversation, Profile } from '@/types'

interface MessagesViewProps {
  initialConversations: Conversation[]
  teamMembers: Profile[]
  currentUserId: string
  currentUserProfile: { id: string; full_name: string | null; avatar_initials: string; role: string }
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return '📎'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType.startsWith('video/')) return '🎬'
  if (fileType.startsWith('audio/')) return '🎵'
  if (fileType.includes('pdf')) return '📄'
  return '📎'
}

export default function MessagesView({
  initialConversations,
  teamMembers,
  currentUserId,
  currentUserProfile,
}: MessagesViewProps) {
  const { colors, theme } = useTheme()
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [newMessageSearch, setNewMessageSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabaseClient = createClient()
  const deleteTimersRef = useRef<Record<string, NodeJS.Timeout>>({})

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }, [])

  // Load messages for selected user
  useEffect(() => {
    async function loadMessages() {
      if (!selectedUserId) return
      setLoading(true)
      const msgs = await getMessages(selectedUserId)
      setMessages(msgs)
      setLoading(false)
      scrollToBottom()
    }
    loadMessages()
  }, [selectedUserId, scrollToBottom])

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabaseClient
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Add message if it's for current conversation
          if (
            (newMsg.sender_id === selectedUserId && newMsg.receiver_id === currentUserId) ||
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === selectedUserId)
          ) {
            setMessages((prev) => [...prev, newMsg])
            scrollToBottom()
          }
          // Update conversation list
          refreshConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [selectedUserId, currentUserId, scrollToBottom, supabaseClient])

  async function refreshConversations() {
    const updated = await getConversations()
    setConversations(updated)
  }

  const selectedConv = conversations.find((c) => c.user.id === selectedUserId)

  const filteredTeamMembers = teamMembers.filter((m) => {
    const q = newMessageSearch.toLowerCase()
    return m.full_name?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  const filteredConversations = conversations.filter((c) => {
    const q = search.toLowerCase()
    return c.user.full_name?.toLowerCase().includes(q) || c.user.email.toLowerCase().includes(q)
  })

  async function handleSendMessage() {
    if ((!messageInput.trim() && !messageInput) || !selectedUserId || sending) return

    setSending(true)
    const content = messageInput.trim()
    setMessageInput('')

    // Optimistic update
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: selectedUserId,
      content,
      file_url: null,
      file_name: null,
      file_type: null,
      created_at: new Date().toISOString(),
      deleted_at: null,
      deleted_by: null,
      sender: {
        id: currentUserId,
        email: 'current@user.local',
        full_name: currentUserProfile.full_name || 'User',
        role: currentUserProfile.role as 'admin' | 'project_manager' | 'designer' | 'developer' | 'designer_dev' | 'viewer' | 'client',
        avatar_initials: currentUserProfile.avatar_initials,
        created_at: new Date().toISOString(),
      },
    }
    setMessages((prev) => [...prev, optimisticMsg])
    scrollToBottom()

    // Server action
    const result = await sendMessage(selectedUserId, content)
    if (result) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? result : m))
      )
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(content)
    }
    setSending(false)
  }

  async function handleDeleteMessage(messageId: string) {
    const ok = await softDeleteMessage(messageId)
    if (ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deleted_at: new Date().toISOString(), deleted_by: currentUserId, content: null }
            : m
        )
      )
      // Clear the delete timer if it exists
      if (deleteTimersRef.current[messageId]) {
        clearTimeout(deleteTimersRef.current[messageId])
        delete deleteTimersRef.current[messageId]
      }
    }
  }

  function startDeleteTimer(messageId: string) {
    if (deleteTimersRef.current[messageId]) {
      clearTimeout(deleteTimersRef.current[messageId])
      delete deleteTimersRef.current[messageId]
    }
  }

  function startNewConversation(userId: string) {
    setSelectedUserId(userId)
    setShowNewMessage(false)
    setNewMessageSearch('')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: colors.bg, overflow: 'hidden' }}>
      {/* Left Panel - Conversations */}
      <div
        style={{
          width: '300px',
          flexShrink: 0,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: colors.bg,
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 900,
                color: colors.text,
                textTransform: 'uppercase',
                letterSpacing: '-0.5px',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Messages
            </h1>
            <button
              onClick={() => setShowNewMessage(!showNewMessage)}
              title="New message"
              style={{
                width: '30px',
                height: '30px',
                backgroundColor: colors.accent,
                borderRadius: 10000,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 1v10M1 6h10"
                  stroke={theme === 'dark' ? '#080808' : '#ffffff'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          {!showNewMessage && (
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textMuted}
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                style={{
                  width: '100%',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.bgTertiary}`,
                  color: colors.text,
                  fontSize: '12px',
                  padding: '8px 10px 8px 30px',
                  fontFamily: 'Montserrat, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderRadius: 12,
                }}
              />
            </div>
          )}

          {/* New Message Search */}
          {showNewMessage && (
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textMuted}
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                value={newMessageSearch}
                onChange={(e) => setNewMessageSearch(e.target.value)}
                placeholder="Search team members…"
                style={{
                  width: '100%',
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.bgTertiary}`,
                  color: colors.text,
                  fontSize: '12px',
                  padding: '8px 10px 8px 30px',
                  fontFamily: 'Montserrat, sans-serif',
                  outline: 'none',
                  boxSizing: 'border-box',
                  borderRadius: 12,
                }}
              />
            </div>
          )}
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {showNewMessage ? (
            filteredTeamMembers.length === 0 ? (
              <p style={{ padding: '20px', color: colors.textMuted, fontSize: '12px', textAlign: 'center' }}>
                No team members found
              </p>
            ) : (
              filteredTeamMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => startNewConversation(member.id)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                    borderBottom: `1px solid ${colors.bgSecondary}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.bgHover
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: colors.accent,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: theme === 'dark' ? '#080808' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    >
                      {member.avatar_initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 2px 0',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: colors.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {member.full_name || member.email}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '10px',
                          color: colors.textMuted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {member.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p
                style={{
                  color: colors.textMuted,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                {search ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = selectedUserId === conv.user.id
              return (
                <div
                  key={conv.user.id}
                  onClick={() => setSelectedUserId(conv.user.id)}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: isActive ? colors.bgSecondary : 'transparent',
                    borderLeft: `2px solid ${isActive ? colors.accent : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.bgHover
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: colors.accent,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: theme === 'dark' ? '#080808' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    >
                      {conv.user.avatar_initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <p
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: isActive ? colors.text : colors.textSecondary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >
                          {conv.user.full_name || conv.user.email}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span
                            style={{
                              backgroundColor: colors.accent,
                              color: theme === 'dark' ? '#080808' : '#ffffff',
                              fontSize: '8px',
                              fontWeight: 800,
                              borderRadius: '10px',
                              padding: '1px 5px',
                              minWidth: '14px',
                              textAlign: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '11px',
                          color: colors.textMuted,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        {conv.lastMessage || <em>no messages yet</em>}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: colors.textMuted, fontFamily: 'Montserrat, sans-serif' }}>
                        {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: colors.bg,
        }}
      >
        {!selectedUserId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.bgHover} strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p
              style={{
                color: colors.textMuted,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              Select a conversation
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 28px',
                borderBottom: `1px solid ${colors.border}`,
                flexShrink: 0,
              }}
            >
              {selectedConv && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: colors.accent,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme === 'dark' ? '#080808' : '#ffffff',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {selectedConv.user.avatar_initials}
                  </div>
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: colors.text,
                        fontFamily: 'Montserrat, sans-serif',
                      }}
                    >
                      {selectedConv.user.full_name || selectedConv.user.email}
                    </p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: colors.textMuted, fontFamily: 'Montserrat, sans-serif' }}>
                      {selectedConv.user.role}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {loading ? (
                <p style={{ color: colors.textMuted, fontSize: '12px' }}>Loading…</p>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId
                  const isDeleted = msg.deleted_at !== null

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        gap: '8px',
                      }}
                      onMouseEnter={() => {
                        if (isOwn && !isDeleted) startDeleteTimer(msg.id)
                      }}
                    >
                      {!isOwn && (
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            backgroundColor: colors.accent,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme === 'dark' ? '#080808' : '#ffffff',
                            fontWeight: 700,
                            fontSize: '9px',
                            flexShrink: 0,
                          }}
                        >
                          {msg.sender?.avatar_initials}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '70%' }}>
                        {/* Message Bubble */}
                        <div
                          style={{
                            backgroundColor: isOwn ? colors.accent : colors.bgSecondary,
                            color: isOwn ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.text,
                            padding: '10px 14px',
                            borderRadius: 16,
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            position: 'relative',
                          }}
                          onContextMenu={(e) => {
                            if (isOwn && !isDeleted) {
                              e.preventDefault()
                              handleDeleteMessage(msg.id)
                            }
                          }}
                        >
                          {isDeleted ? (
                            <em style={{ fontSize: '12px', opacity: 0.6 }}>This message was deleted</em>
                          ) : msg.file_url ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {msg.file_type?.startsWith('image/') ? (
                                <img
                                  src={msg.file_url}
                                  alt={msg.file_name || 'File'}
                                  style={{
                                    maxWidth: '300px',
                                    maxHeight: '400px',
                                    borderRadius: 8,
                                    display: 'block',
                                  }}
                                />
                              ) : (
                                <a
                                  href={msg.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: isOwn ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.accent,
                                    textDecoration: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                  }}
                                >
                                  <span style={{ fontSize: '16px' }}>{getFileIcon(msg.file_type)}</span>
                                  {msg.file_name}
                                </a>
                              )}
                              {msg.content && <p style={{ margin: 0, fontSize: '12px' }}>{msg.content}</p>}
                            </div>
                          ) : (
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.4, fontFamily: 'Montserrat, sans-serif' }}>
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Timestamp & Delete Button */}
                        <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '6px' }}>
                          <p style={{ margin: 0, fontSize: '10px', color: colors.textMuted, fontFamily: 'Montserrat, sans-serif' }}>
                            {formatTime(msg.created_at)}
                          </p>
                          {isOwn && !isDeleted && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              title="Delete message"
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: colors.textMuted,
                                cursor: 'pointer',
                                fontSize: '10px',
                                padding: '2px 4px',
                                fontFamily: 'Montserrat, sans-serif',
                                opacity: 0.6,
                                transition: 'opacity 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.opacity = '1'
                                ;(e.currentTarget as HTMLButtonElement).style.color = colors.danger
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'
                                ;(e.currentTarget as HTMLButtonElement).style.color = colors.textMuted
                              }}
                            >
                              delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div
              style={{
                borderTop: `1px solid ${colors.border}`,
                padding: '16px 28px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type a message…"
                disabled={sending}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgSecondary,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  fontSize: '13px',
                  padding: '10px 14px',
                  fontFamily: 'Montserrat, sans-serif',
                  outline: 'none',
                  borderRadius: 12,
                  minHeight: '38px',
                  resize: 'none',
                  lineHeight: 1.4,
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending}
                style={{
                  backgroundColor: colors.accent,
                  border: 'none',
                  color: theme === 'dark' ? '#080808' : '#ffffff',
                  padding: '10px 20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: sending || !messageInput.trim() ? 'not-allowed' : 'pointer',
                  borderRadius: 10000,
                  fontFamily: 'Montserrat, sans-serif',
                  opacity: sending || !messageInput.trim() ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
