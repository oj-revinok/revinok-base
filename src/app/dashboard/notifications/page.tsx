'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import {
  getMyNotifications,
  markAllRead,
  markRead,
  getLaunchReview,
  approveLaunchReview,
  declineLaunchReview,
  type Notification,
} from '@/lib/actions/notifications'

function notifAccent(type: string) {
  if (type === 'launch_review_request') return '#BDD630'
  if (type === 'launch_approved') return '#4ade80'
  if (type === 'launch_declined') return '#ef4444'
  if (type === 'project_added') return '#4a9eff'
  if (type === 'note_shared') return '#a78bfa'
  return '#333333'
}

function notifTypeLabel(type: string) {
  if (type === 'launch_review_request') return 'Review Request'
  if (type === 'launch_approved') return 'Approved'
  if (type === 'launch_declined') return 'Declined'
  if (type === 'project_added') return 'Project'
  if (type === 'note_shared') return 'Note Shared'
  return 'Notification'
}

function notifTitle(n: Notification) {
  const project = n.data?.project_name || n.project?.name || 'a project'
  const sender = n.data?.submitted_by_name || n.data?.reviewer_name || n.data?.shared_by_name || n.sender?.full_name || 'Someone'
  if (n.type === 'launch_review_request') return `${sender} sent a Go-Live checklist for ${project}`
  if (n.type === 'launch_approved') return `${sender} approved the Go-Live checklist for ${project}`
  if (n.type === 'launch_declined') return `${sender} declined the Go-Live checklist for ${project}`
  if (n.type === 'project_added') return `${sender} added you to ${project}`
  if (n.type === 'note_shared') {
    const noteTitle = n.data?.note_title || 'a note'
    const access = n.data?.access_level || 'view'
    return `${sender} shared "${noteTitle}" with you (${access} access)`
  }
  return 'New notification'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotificationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { colors, theme } = useTheme()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReview, setActiveReview] = useState<any>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [declineMsg, setDeclineMsg] = useState('')
  const [actionPending, setActionPending] = useState(false)
  const [actionDone, setActionDone] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const notifs = await getMyNotifications()
      setNotifications(notifs)
      setLoading(false)
    }
    load()
  }, [])

  async function handleMarkAllRead() {
    await markAllRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleOpenReview(notification: Notification) {
    await markRead(notification.id)
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n))
    const reviewId = notification.data?.review_id
    if (!reviewId) return
    setLoadingReview(true)
    const review = await getLaunchReview(reviewId)
    setActiveReview(review)
    setLoadingReview(false)
  }

  async function handleApprove() {
    if (!activeReview) return
    setActionPending(true)
    try {
      await approveLaunchReview(activeReview.id)
      setActionDone('approved')
    } catch (err) {
      console.error(err)
    } finally {
      setActionPending(false)
    }
  }

  async function handleDecline() {
    if (!activeReview || !declineMsg.trim()) return
    setActionPending(true)
    try {
      await declineLaunchReview(activeReview.id, declineMsg)
      setActionDone('declined')
    } catch (err) {
      console.error(err)
    } finally {
      setActionPending(false)
    }
  }

  const unread = notifications.filter(n => !n.is_read).length

  if (loading) {
    return <div style={{ padding: '40px 20px', color: colors.textMuted, fontSize: '13px' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '20px 16px 80px', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, color: colors.text, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            Notifications
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: colors.borderLight }}>
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: '8px 18px', backgroundColor: 'transparent',
              border: `1px solid ${colors.bgHover}`, color: colors.textSecondary,
              fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
              letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderLight; e.currentTarget.style.color = colors.textSecondary }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = colors.bgHover; e.currentTarget.style.color = colors.textSecondary }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Empty state */}
      {notifications.length === 0 ? (
        <div style={{
          border: `1px solid ${colors.border}`, padding: '60px 40px',
          textAlign: 'center', backgroundColor: colors.bg,
        }}>
          <p style={{ color: colors.borderLight, fontSize: '13px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            No notifications yet
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {notifications.map(n => {
            const accent = notifAccent(n.type)
            const isReview = n.type === 'launch_review_request'
            return (
              <div
                key={n.id}
                onClick={() => { if (isReview) handleOpenReview(n) }}
                style={{
                  display: 'flex',
                  backgroundColor: n.is_read ? colors.bg : colors.bgSecondary,
                  borderLeft: `3px solid ${n.is_read ? colors.border : accent}`,
                  borderRight: `1px solid ${colors.border}`,
                  borderTop: `1px solid ${colors.border}`,
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: isReview ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => { if (isReview) (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.bgHover }}
                onMouseLeave={e => { if (isReview) (e.currentTarget as HTMLDivElement).style.backgroundColor = n.is_read ? colors.bg : colors.bgSecondary }}
              >
                <div style={{ flex: 1, padding: '16px 18px' }}>
                  {/* Type tag + timestamp row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.8px', color: accent,
                    }}>
                      {notifTypeLabel(n.type)}
                    </span>
                    <span style={{ fontSize: '10px', color: colors.borderLight, flexShrink: 0 }}>
                      {formatDate(n.created_at)}
                    </span>
                  </div>

                  {/* Main text */}
                  <p style={{
                    margin: 0, fontSize: '13px', lineHeight: 1.55,
                    color: n.is_read ? colors.textSecondary : colors.text,
                    fontWeight: n.is_read ? 400 : 500,
                  }}>
                    {notifTitle(n)}
                  </p>

                  {/* Decline message */}
                  {n.type === 'launch_declined' && n.data?.message && (
                    <p style={{
                      margin: '8px 0 0 0', fontSize: '12px', color: '#ef4444',
                      lineHeight: 1.5, fontStyle: 'italic', borderLeft: '2px solid #3a1010',
                      paddingLeft: '10px',
                    }}>
                      {n.data.message}
                    </p>
                  )}

                  {/* Review CTA */}
                  {isReview && (
                    <p style={{
                      margin: '10px 0 0 0', fontSize: '10px', fontWeight: 700,
                      color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>
                      Open review →
                    </p>
                  )}

                  {/* Project-added CTA */}
                  {n.type === 'project_added' && n.project_id && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await markRead(n.id)
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                          router.push(`/dashboard/projects/${n.project_id}`)
                        }}
                        style={{
                          padding: '6px 14px', backgroundColor: 'transparent',
                          border: '1px solid #4a9eff', color: '#4a9eff',
                          fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
                          letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        Open Project →
                      </button>
                    </div>
                  )}

                  {/* Note-shared CTA */}
                  {n.type === 'note_shared' && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          await markRead(n.id)
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
                          router.push('/dashboard/notes')
                        }}
                        style={{
                          padding: '6px 14px', backgroundColor: 'transparent',
                          border: '1px solid #a78bfa', color: '#a78bfa',
                          fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
                          letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                        }}
                      >
                        Open Notes →
                      </button>
                    </div>
                  )}
                </div>

                {/* Unread dot */}
                {!n.is_read && (
                  <div style={{
                    width: '6px', alignSelf: 'stretch', backgroundColor: accent,
                    opacity: 0.4, flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Review modal */}
      {(loadingReview || activeReview) && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !actionPending) { setActiveReview(null); setActionDone(null); setDeclineMsg('') } }}
        >
          <div style={{
            backgroundColor: colors.bg, border: `1px solid ${colors.bgHover}`,
            width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto',
          }}>
            {loadingReview ? (
              <div style={{ padding: '40px', color: colors.textMuted, fontSize: '13px' }}>Loading…</div>
            ) : actionDone ? (
              /* Action done state */
              <div style={{ padding: '48px 40px', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '48px', height: '48px', marginBottom: '20px',
                  border: `2px solid ${actionDone === 'approved' ? '#4ade80' : '#ef4444'}`,
                }}>
                  {actionDone === 'approved' ? (
                    <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                      <path d="M2 7L7.5 12.5L18 2" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 2L14 14M14 2L2 14" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <h2 style={{ color: colors.text, fontSize: '16px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Checklist {actionDone === 'approved' ? 'Approved' : 'Declined'}
                </h2>
                <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                  {actionDone === 'approved'
                    ? 'Saved to project files. The submitter has been notified.'
                    : 'The submitter has been notified with your message.'}
                </p>
                <button
                  onClick={() => { setActiveReview(null); setActionDone(null) }}
                  style={{
                    padding: '12px 32px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#000000',
                    border: 'none', fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
                    letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  Close
                </button>
              </div>
            ) : activeReview ? (
              <>
                {/* Modal header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '24px 28px 20px', borderBottom: `1px solid ${colors.border}`,
                }}>
                  <div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '9px', color: colors.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Go-Live Checklist Review
                    </p>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: colors.text }}>
                      {activeReview.project?.name}
                    </h2>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.textMuted }}>
                      Submitted by {activeReview.submitter?.full_name || activeReview.submitter?.email}
                      {' · '}
                      {new Date(activeReview.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveReview(null); setDeclineMsg('') }}
                    style={{
                      background: 'none', border: `1px solid ${colors.bgHover}`, color: colors.textMuted,
                      fontSize: '14px', cursor: 'pointer', padding: '6px 10px', lineHeight: 1,
                      fontFamily: 'Montserrat, sans-serif', flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ padding: '24px 28px' }}>
                  {/* Progress bar */}
                  {activeReview.checklist_data?.progress && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Completion
                        </span>
                        <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                          {activeReview.checklist_data.progress.done} / {activeReview.checklist_data.progress.total}
                        </span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: colors.border, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', backgroundColor: colors.accent,
                          width: `${Math.round((activeReview.checklist_data.progress.done / activeReview.checklist_data.progress.total) * 100)}%`,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Checklist items */}
                  {activeReview.checklist_data?.items && (
                    <div style={{ marginBottom: '24px', maxHeight: '300px', overflowY: 'auto', border: `1px solid ${colors.border}` }}>
                      {(activeReview.checklist_data.items as any[]).map((item: any) => (
                        <div key={item.id} style={{
                          display: 'flex', gap: '12px', padding: '10px 14px',
                          borderBottom: `1px solid ${colors.bgSecondary}`, alignItems: 'center',
                        }}>
                          <div style={{
                            width: '14px', height: '14px', border: '1.5px solid',
                            borderColor: item.done ? '#4ade80' : colors.bgHover,
                            backgroundColor: item.done ? '#4ade80' : 'transparent',
                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {item.done && (
                              <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                                <path d="M1 2.5L2.5 4L6 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{
                            fontSize: '12px', flex: 1, lineHeight: 1.5,
                            color: item.done ? colors.textMuted : colors.text,
                            textDecoration: item.done ? 'line-through' : 'none',
                          }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: '10px', color: colors.borderLight }}>{item.sectionNum}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status / actions */}
                  {activeReview.status !== 'pending' ? (
                    <div style={{
                      padding: '14px 16px',
                      backgroundColor: activeReview.status === 'approved' ? '#071a0c' : '#1a0707',
                      border: `1px solid ${activeReview.status === 'approved' ? '#1a4a2a' : '#4a1a1a'}`,
                    }}>
                      <p style={{
                        margin: 0, fontSize: '13px', fontWeight: 600,
                        color: activeReview.status === 'approved' ? '#4ade80' : '#ef4444',
                      }}>
                        {activeReview.status === 'approved' ? 'Approved' : 'Declined'}
                        {activeReview.decline_message && ` — ${activeReview.decline_message}`}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{
                          display: 'block', fontSize: '10px', fontWeight: 700,
                          color: colors.textMuted, marginBottom: '8px',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Decline message <span style={{ color: colors.borderLight }}>(required to decline)</span>
                        </label>
                        <textarea
                          value={declineMsg}
                          onChange={e => setDeclineMsg(e.target.value)}
                          placeholder="Explain what needs to be fixed before launch…"
                          rows={3}
                          style={{
                            width: '100%', backgroundColor: colors.bgTertiary, border: `1px solid ${colors.bgHover}`,
                            color: colors.text, fontSize: '13px', padding: '12px',
                            fontFamily: 'Montserrat, sans-serif', resize: 'vertical',
                            boxSizing: 'border-box', lineHeight: 1.5, outline: 'none',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={handleDecline}
                          disabled={!declineMsg.trim() || actionPending}
                          style={{
                            flex: 1, padding: '13px', backgroundColor: 'transparent',
                            border: `1px solid ${declineMsg.trim() ? '#ef4444' : colors.bgHover}`,
                            color: declineMsg.trim() ? '#ef4444' : colors.borderLight,
                            fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
                            letterSpacing: '0.5px', cursor: declineMsg.trim() ? 'pointer' : 'not-allowed',
                            fontFamily: 'Montserrat, sans-serif', opacity: actionPending ? 0.6 : 1,
                            transition: 'border-color 0.15s, color 0.15s',
                          }}
                        >
                          Decline
                        </button>
                        <button
                          onClick={handleApprove}
                          disabled={actionPending}
                          style={{
                            flex: 2, padding: '13px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#000000',
                            border: 'none', fontSize: '13px', fontWeight: 700, borderRadius: 10000, textTransform: 'uppercase',
                            letterSpacing: '0.5px', cursor: 'pointer',
                            fontFamily: 'Montserrat, sans-serif', opacity: actionPending ? 0.7 : 1,
                          }}
                        >
                          {actionPending ? 'Processing…' : 'Approve & Save to Files'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
