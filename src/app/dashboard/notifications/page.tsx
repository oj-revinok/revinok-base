'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  getMyNotifications,
  markAllRead,
  markRead,
  getLaunchReview,
  approveLaunchReview,
  declineLaunchReview,
  type Notification,
} from '@/lib/actions/notifications'

export default function NotificationsPage() {
  const supabase = createClient()
  const router = useRouter()
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

  function notifIcon(type: string) {
    if (type === 'launch_review_request') return '🚀'
    if (type === 'launch_approved') return '✅'
    if (type === 'launch_declined') return '❌'
    if (type === 'project_added') return '📁'
    return '🔔'
  }

  function notifTitle(n: Notification) {
    const project = n.data?.project_name || n.project?.name || 'a project'
    const sender = n.data?.submitted_by_name || n.data?.reviewer_name || n.sender?.full_name || 'Someone'
    if (n.type === 'launch_review_request') return `${sender} sent you a Go-Live checklist for ${project}`
    if (n.type === 'launch_approved') return `${sender} approved the Go-Live checklist for ${project}`
    if (n.type === 'launch_declined') return `${sender} declined the Go-Live checklist for ${project}`
    if (n.type === 'project_added') return `${sender} added you to ${project}`
    return 'New notification'
  }

  if (loading) {
    return <div style={{ padding: '40px 20px', color: '#666666', fontSize: '13px' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', gap: '12px', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 32px)', fontWeight: 900, color: '#ffffff', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>
          NOTIFICATIONS {unread > 0 && <span style={{ fontSize: '14px', color: '#BDD630', fontWeight: 700 }}>({unread})</span>}
        </h1>
        {unread > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #222', color: '#666666', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>🔔</p>
          <p style={{ color: '#555555', fontSize: '14px', margin: 0 }}>No notifications yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(n => (
            <div
              key={n.id}
              style={{
                backgroundColor: n.is_read ? '#0e0e0e' : '#0d1a0d',
                border: n.is_read ? '1px solid #1a1a1a' : '1px solid #1a3a1a',
                padding: '16px 20px',
                cursor: n.type === 'launch_review_request' ? 'pointer' : 'default',
                transition: 'border-color 0.15s',
              }}
              onClick={() => { if (n.type === 'launch_review_request') handleOpenReview(n) }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>{notifIcon(n.type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: n.is_read ? '#999999' : '#ffffff', fontWeight: n.is_read ? 400 : 600, lineHeight: 1.5 }}>
                    {notifTitle(n)}
                  </p>
                  {n.type === 'launch_declined' && n.data?.message && (
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#ef4444', lineHeight: 1.5, fontStyle: 'italic' }}>
                      "{n.data.message}"
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '11px', color: '#444444' }}>
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!n.is_read && (
                  <div style={{ width: '8px', height: '8px', backgroundColor: '#BDD630', borderRadius: '50%', flexShrink: 0, marginTop: '6px' }} />
                )}
              </div>
              {n.type === 'launch_review_request' && (
                <p style={{ margin: '10px 0 0 34px', fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
                  Click to review →
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {(loadingReview || activeReview) && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget && !actionPending) { setActiveReview(null); setActionDone(null); setDeclineMsg('') } }}
        >
          <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '32px 28px' }}>
            {loadingReview ? (
              <p style={{ color: '#666666', fontSize: '13px' }}>Loading review…</p>
            ) : actionDone ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '40px', margin: '0 0 16px 0' }}>{actionDone === 'approved' ? '✅' : '❌'}</p>
                <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 800, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
                  {actionDone === 'approved' ? 'Checklist Approved' : 'Checklist Declined'}
                </h2>
                <p style={{ color: '#999999', fontSize: '13px', margin: '0 0 24px 0' }}>
                  {actionDone === 'approved'
                    ? 'The checklist has been saved to the project files. The submitter has been notified.'
                    : 'The submitter has been notified with your message.'}
                </p>
                <button
                  onClick={() => { setActiveReview(null); setActionDone(null) }}
                  style={{ padding: '12px 28px', backgroundColor: '#BDD630', color: '#080808', border: 'none', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
                >
                  CLOSE
                </button>
              </div>
            ) : activeReview ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
                  <div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#BDD630', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Go-Live Checklist Review</p>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>{activeReview.project?.name}</h2>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#666666' }}>
                      Submitted by {activeReview.submitter?.full_name || activeReview.submitter?.email} ·{' '}
                      {new Date(activeReview.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveReview(null); setDeclineMsg('') }}
                    style={{ background: 'none', border: 'none', color: '#555555', fontSize: '20px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
                  >✕</button>
                </div>

                {/* Progress */}
                {activeReview.checklist_data?.progress && (
                  <div style={{ backgroundColor: '#111111', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#BDD630', fontWeight: 700 }}>
                      {activeReview.checklist_data.progress.done} / {activeReview.checklist_data.progress.total} completed
                    </span>
                    <div style={{ flex: 1, height: '3px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', backgroundColor: '#BDD630',
                        width: `${Math.round((activeReview.checklist_data.progress.done / activeReview.checklist_data.progress.total) * 100)}%`
                      }} />
                    </div>
                  </div>
                )}

                {/* Checklist items grouped */}
                {activeReview.checklist_data?.items && (
                  <div style={{ marginBottom: '28px', maxHeight: '320px', overflowY: 'auto', border: '1px solid #1a1a1a' }}>
                    {(activeReview.checklist_data.items as any[]).map((item: any) => (
                      <div key={item.id} style={{ display: 'flex', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #111111', alignItems: 'center' }}>
                        <div style={{
                          width: '14px', height: '14px', border: '1.5px solid',
                          borderColor: item.done ? '#4ade80' : '#333333',
                          backgroundColor: item.done ? '#4ade80' : 'transparent',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.done && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                        </div>
                        <span style={{ fontSize: '12px', color: item.done ? '#666666' : '#cccccc', textDecoration: item.done ? 'line-through' : 'none', flex: 1 }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '10px', color: '#444444' }}>{item.sectionNum}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeReview.status !== 'pending' ? (
                  <div style={{ padding: '16px', backgroundColor: activeReview.status === 'approved' ? '#051a0a' : '#1a0505', border: `1px solid ${activeReview.status === 'approved' ? '#4ade80' : '#ef4444'}` }}>
                    <p style={{ margin: 0, color: activeReview.status === 'approved' ? '#4ade80' : '#ef4444', fontSize: '13px', fontWeight: 600 }}>
                      {activeReview.status === 'approved' ? '✓ Approved' : '✕ Declined'}
                      {activeReview.decline_message && `: ${activeReview.decline_message}`}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#BDD630', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Decline message (required to decline)
                      </label>
                      <textarea
                        value={declineMsg}
                        onChange={e => setDeclineMsg(e.target.value)}
                        placeholder="Explain what needs to be fixed before launch…"
                        rows={3}
                        style={{ width: '100%', backgroundColor: '#111111', border: '1px solid #1a1a1a', color: '#ffffff', fontSize: '13px', padding: '12px', fontFamily: 'Montserrat, sans-serif', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={handleDecline}
                        disabled={!declineMsg.trim() || actionPending}
                        style={{
                          flex: 1, padding: '14px', backgroundColor: 'transparent', border: '1px solid #ef4444',
                          color: declineMsg.trim() ? '#ef4444' : '#555555', fontSize: '12px', fontWeight: 700,
                          textTransform: 'uppercase', cursor: declineMsg.trim() ? 'pointer' : 'not-allowed',
                          fontFamily: 'Montserrat, sans-serif', opacity: actionPending ? 0.7 : 1,
                        }}
                      >
                        DECLINE
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={actionPending}
                        style={{
                          flex: 2, padding: '14px', backgroundColor: '#BDD630', color: '#080808', border: 'none',
                          fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                          fontFamily: 'Montserrat, sans-serif', opacity: actionPending ? 0.7 : 1,
                        }}
                      >
                        {actionPending ? 'PROCESSING…' : '✓ APPROVE & SAVE TO FILES'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
