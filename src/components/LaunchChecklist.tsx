'use client'

import { useState } from 'react'
import { sendLaunchForReview } from '@/lib/actions/notifications'
import { useTheme } from '@/context/ThemeContext'

interface ChecklistItem {
  id: string
  section: string
  sectionNum: string
  title: string
  note: string
  tag: 'critical' | 'seo' | 'design' | 'webflow' | 'forms'
  done: boolean
}

const CHECKLIST_ITEMS: Omit<ChecklistItem, 'done'>[] = [
  // SECTION A – Pre-Live
  { id: 's01-01', sectionNum: '01', section: 'Google Drive Project Folder', title: 'Google Drive folder created for the project', note: 'Shared with team. URL recorded in project links.', tag: 'critical' },
  { id: 's01-02', sectionNum: '01', section: 'Google Drive Project Folder', title: 'Screen recording or screenshots of all pages of old site saved', note: 'Record a walkthrough or take full-page screenshots of every live page. Save to /old-site/ in Drive folder.', tag: 'critical' },
  { id: 's01-03', sectionNum: '01', section: 'Google Drive Project Folder', title: 'Sitemap of existing site documented', note: 'List all URLs of current site in a spreadsheet or doc inside the folder.', tag: 'webflow' },
  { id: 's01-04', sectionNum: '01', section: 'Google Drive Project Folder', title: 'Redirections mapped (if applicable)', note: 'Old URL → New URL. Add to a redirects.csv inside the folder. All 301s, no 302s.', tag: 'critical' },
  { id: 's02-01', sectionNum: '02', section: 'Design QA', title: 'Responsive on all breakpoints', note: 'Check Desktop, Tablet, Mobile Landscape, Mobile Portrait in Webflow Designer.', tag: 'critical' },
  { id: 's02-02', sectionNum: '02', section: 'Design QA', title: 'All pages checked on real mobile device', note: 'Scroll through every page on an actual phone. Check tap targets, readability, and usability.', tag: 'critical' },
  { id: 's02-03', sectionNum: '02', section: 'Design QA', title: 'Fonts loading correctly', note: 'Verify custom fonts render on published domain, not just preview.', tag: 'design' },
  { id: 's02-04', sectionNum: '02', section: 'Design QA', title: 'Images not stretched or pixelated', note: 'Check all images at 1x and 2x (retina). Use correct aspect ratio constraints.', tag: 'design' },
  { id: 's02-05', sectionNum: '02', section: 'Design QA', title: 'Spacing consistent across all pages', note: 'No rogue margins or padding from copy-pasted sections.', tag: 'design' },
  { id: 's02-06', sectionNum: '02', section: 'Design QA', title: 'Hover & focus states on all interactive elements', note: 'Buttons, links, nav items, form inputs — check all.', tag: 'design' },
  { id: 's02-07', sectionNum: '02', section: 'Design QA', title: 'No overflow / horizontal scroll on mobile', note: 'Inspect every section at 320px width.', tag: 'critical' },
  { id: 's02-08', sectionNum: '02', section: 'Design QA', title: 'Favicon set', note: '32x32 and 180x180 Apple touch icon uploaded in Project Settings.', tag: 'design' },
  { id: 's02-09', sectionNum: '02', section: 'Design QA', title: 'Browser tab title correct', note: 'Check page title and site name in Project Settings > General.', tag: 'design' },
  { id: 's02-10', sectionNum: '02', section: 'Design QA', title: 'Alt text on all images', note: 'Recommended for accessibility and SEO. Especially hero images, product shots, images with text.', tag: 'design' },
  { id: 's03-01', sectionNum: '03', section: 'SEO', title: 'Meta titles & descriptions on every page', note: 'Unique. Title under 60 chars, description under 160 chars.', tag: 'seo' },
  { id: 's03-02', sectionNum: '03', section: 'SEO', title: 'Heading hierarchy correct (H1 > H2 > H3)', note: 'One H1 per page. No skipped levels. Use Webflow heading elements, not styled divs.', tag: 'seo' },
  { id: 's03-03', sectionNum: '03', section: 'SEO', title: 'Images compressed and optimized', note: 'Use WebP where possible. Source files should be under 2MB.', tag: 'seo' },
  { id: 's03-04', sectionNum: '03', section: 'SEO', title: '301 redirects configured in Webflow', note: 'Match your redirect map from the Drive folder. Project Settings > Hosting > Redirects.', tag: 'critical' },
  { id: 's04-01', sectionNum: '04', section: 'Forms', title: 'All form names are clearly labelled', note: 'e.g. "Contact Form", "Newsletter Signup". Set in Webflow Form Settings.', tag: 'forms' },
  { id: 's04-02', sectionNum: '04', section: 'Forms', title: 'All field labels are correct and visible', note: 'No default placeholder-only inputs. Labels must be present.', tag: 'forms' },
  { id: 's04-03', sectionNum: '04', section: 'Forms', title: 'All required fields are marked', note: 'Check that required toggle is on for mandatory fields.', tag: 'forms' },
  { id: 's04-04', sectionNum: '04', section: 'Forms', title: 'All forms tested end-to-end', note: 'Submit each form. Check Webflow dashboard or integration (Zapier/Make) for receipt.', tag: 'critical' },
  { id: 's04-05', sectionNum: '04', section: 'Forms', title: 'Form success & error states display correctly', note: 'Verify both states at all breakpoints. Success message must be clear.', tag: 'design' },
  { id: 's05-01', sectionNum: '05', section: 'Webflow Settings', title: 'Minify HTML, CSS, and JS enabled', note: 'Project Settings > General > Enable all three minification options.', tag: 'webflow' },
  { id: 's05-02', sectionNum: '05', section: 'Webflow Settings', title: 'CMS content finalized and published', note: 'No placeholder or lorem ipsum in any CMS collection. Check all collection pages.', tag: 'critical' },
  { id: 's05-03', sectionNum: '05', section: 'Webflow Settings', title: 'Interactions & animations tested on real device', note: 'Scroll triggers and IX2 animations can behave differently outside Designer preview.', tag: 'webflow' },
  { id: 's05-04', sectionNum: '05', section: 'Webflow Settings', title: 'All links functional — no broken or placeholder hrefs', note: 'Check nav, footer, CTAs, and in-body links. Use a link checker tool.', tag: 'critical' },
  { id: 's05-05', sectionNum: '05', section: 'Webflow Settings', title: '404 page published', note: 'Custom 404 built and set in Project Settings > SEO.', tag: 'webflow' },
  { id: 's05-06', sectionNum: '05', section: 'Webflow Settings', title: 'Backup / snapshot taken', note: 'Save a project backup in Webflow before any DNS changes.', tag: 'critical' },
  // SECTION B – Post-Live
  { id: 's06-01', sectionNum: '06', section: 'Domain & Hosting', title: 'Custom domain connected and SSL active', note: 'Green lock in browser. Check in Project Settings > Hosting. Allow up to 24hrs for propagation.', tag: 'critical' },
  { id: 's06-02', sectionNum: '06', section: 'Domain & Hosting', title: 'Site loads correctly on the live domain', note: 'Open incognito. Check home page and at least 3 internal pages.', tag: 'critical' },
  { id: 's07-01', sectionNum: '07', section: 'Post-Live QA', title: 'noindex NOT set on live pages', note: 'Check Project Settings > SEO. Remove any accidental noindex tags left from staging.', tag: 'critical' },
  { id: 's07-02', sectionNum: '07', section: 'Post-Live QA', title: 'Sitemap & robots.txt accessible', note: 'Confirm at yourdomain.com/sitemap.xml and /robots.txt', tag: 'seo' },
  { id: 's07-03', sectionNum: '07', section: 'Post-Live QA', title: 'Page speed check run', note: 'Run PageSpeed Insights on homepage and key pages. Flag anything below 70 on mobile.', tag: 'seo' },
  { id: 's07-04', sectionNum: '07', section: 'Post-Live QA', title: 'Redirects verified on live domain', note: 'Test every old URL from your redirect map. Confirm 301 to correct new URL.', tag: 'critical' },
  { id: 's07-05', sectionNum: '07', section: 'Post-Live QA', title: 'Cross-browser test done', note: 'Chrome, Safari, Firefox minimum. Safari on iOS is highest priority.', tag: 'design' },
  { id: 's07-06', sectionNum: '07', section: 'Post-Live QA', title: 'Webflow badge hidden', note: 'Project Settings > General > Remove Webflow badge (requires paid plan).', tag: 'webflow' },
  { id: 's07-07', sectionNum: '07', section: 'Post-Live QA', title: 'Webflow HTML comment hidden', note: 'Project Settings > General > "Hide Webflow branding in HTML".', tag: 'webflow' },
  { id: 's08-01', sectionNum: '08', section: 'Client Handoff', title: 'Client email confirmed on all forms', note: 'Open each form in Webflow — confirm notification email is the client\'s, not the agency\'s.', tag: 'critical' },
  { id: 's08-02', sectionNum: '08', section: 'Client Handoff', title: 'reCAPTCHA working on live domain (if added)', note: 'Test submission on the live URL. reCAPTCHA challenge must fire. Check Project Settings > Integrations.', tag: 'critical' },
  { id: 's08-03', sectionNum: '08', section: 'Client Handoff', title: 'Spam protection enabled on all forms', note: 'Webflow built-in spam filter toggled on in each form\'s settings.', tag: 'forms' },
]

const TAG_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  critical: { bg: '#1a0505', color: '#ef4444', label: 'Critical' },
  seo:      { bg: '#050a1a', color: '#4a9eff', label: 'SEO' },
  design:   { bg: '#0a0900', color: '#BDD630', label: 'Design' },
  webflow:  { bg: '#051a0a', color: '#4ade80', label: 'Webflow' },
  forms:    { bg: '#050a1a', color: '#38bdf8', label: 'Forms' },
}

const SECTIONS_ORDER = ['01','02','03','04','05','06','07','08']
const PRE_SECTIONS = ['01','02','03','04','05']
const POST_SECTIONS = ['06','07','08']

const SECTION_NAMES: Record<string, string> = {
  '01': 'Google Drive Project Folder',
  '02': 'Design QA',
  '03': 'SEO',
  '04': 'Forms',
  '05': 'Webflow Settings',
  '06': 'Domain & Hosting',
  '07': 'Post-Live QA',
  '08': 'Client Handoff',
}

interface ProjectMember {
  id: string
  profile_id: string
  profiles: {
    id: string
    full_name: string | null
    email: string
    role: string
  } | null
}

interface Props {
  projectId: string
  projectName: string
  currentUserName: string
  projectMembers: ProjectMember[]
  onClose: () => void
}

type Step = 'checklist' | 'send' | 'sent'

export default function LaunchChecklist({ projectId, projectName, currentUserName, projectMembers, onClose }: Props) {
  const { colors, theme } = useTheme()
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map(item => ({ ...item, done: false }))
  )
  const [step, setStep] = useState<Step>('checklist')
  const [selectedReviewerId, setSelectedReviewerId] = useState('')
  const [sendComment, setSendComment] = useState('')
  const [latestUrl, setLatestUrl] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const total = items.length
  const doneCount = items.filter(i => i.done).length
  const pct = Math.round((doneCount / total) * 100)

  // Potential reviewers: PMs and admins from project members
  const reviewers = projectMembers
    .filter(m => m.profiles && (m.profiles.role === 'admin' || m.profiles.role === 'project_manager'))
    .map(m => m.profiles!)

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  async function handleSendForReview() {
    if (!selectedReviewerId) return
    setSending(true)
    setSendError('')
    try {
      const checklistData = {
        projectId,
        projectName,
        reviewedBy: currentUserName,
        sentAt: new Date().toISOString(),
        progress: { done: doneCount, total },
        items: items.map(({ id, sectionNum, section, title, done }) => ({ id, sectionNum, section, title, done })),
        ...(sendComment.trim() && { comment: sendComment.trim() }),
        ...(latestUrl.trim() && { latestUrl: latestUrl.trim() }),
        ...(liveUrl.trim() && { liveUrl: liveUrl.trim() }),
      }
      await sendLaunchForReview(
        projectId,
        projectName,
        selectedReviewerId,
        checklistData,
        currentUserName || 'Team member'
      )
      setStep('sent')
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : 'Failed to send for review')
    } finally {
      setSending(false)
    }
  }

  const groupedBySection = SECTIONS_ORDER.reduce((acc, num) => {
    acc[num] = items.filter(i => i.sectionNum === num)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  // ── SENT confirmation ──────────────────────────────────────────────────────
  if (step === 'sent') {
    const reviewer = reviewers.find(r => r.id === selectedReviewerId)
    const reviewerName = reviewer?.full_name || reviewer?.email || 'Reviewer'
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '48px 40px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', backgroundColor: colors.bgTertiary, border: `2px solid ${colors.accent}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><path d="M1 9.5L7.5 16L21 2" stroke={colors.accent} strokeWidth="2.5" strokeLinecap="round"/></svg>
          </div>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 800, margin: '0 0 12px 0', textTransform: 'uppercase' }}>Sent for Review</h2>
          <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, margin: '0 0 8px 0' }}>
            The Go-Live checklist for <strong style={{ color: colors.text }}>{projectName}</strong> has been sent to
          </p>
          <p style={{ color: colors.accent, fontSize: '16px', fontWeight: 700, margin: '0 0 32px 0' }}>{reviewerName}</p>
          <p style={{ color: colors.textMuted, fontSize: '12px', margin: '0 0 32px 0' }}>
            They will receive a notification and can approve or decline the checklist. You'll be notified either way.
          </p>
          <button
            onClick={onClose}
            style={{ padding: '14px 32px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', fontSize: '13px', fontWeight: 600, borderRadius: 10000, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif', textTransform: 'uppercase' }}
          >
            DONE
          </button>
        </div>
      </div>
    )
  }

  // ── SEND STEP ──────────────────────────────────────────────────────────────
  if (step === 'send') {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '40px 32px', maxWidth: '480px', width: '100%' }}>
          <h2 style={{ color: colors.text, fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Send for Review</h2>
          <p style={{ color: colors.textMuted, fontSize: '13px', margin: '0 0 28px 0', lineHeight: 1.5 }}>
            Select who should review the Go-Live checklist for <strong style={{ color: colors.text }}>{projectName}</strong>.
            They'll receive a notification with the full checklist and can approve or decline.
          </p>

          <div style={{ marginBottom: '8px', fontSize: '10px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reviewed by</div>
          <div style={{ marginBottom: '8px', padding: '10px 14px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, fontSize: '13px', color: colors.textSecondary }}>
            {currentUserName || 'You'}
          </div>

          <div style={{ marginBottom: '8px', marginTop: '20px', fontSize: '10px', fontWeight: 700, color: colors.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Send to</div>

          {reviewers.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: '13px', marginBottom: '20px' }}>
              No admins or project managers are assigned to this project yet. Ask your PM to join the project first.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
              {reviewers.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReviewerId(r.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                    backgroundColor: selectedReviewerId === r.id ? colors.bgTertiary : colors.bgSecondary,
                    border: selectedReviewerId === r.id ? `1px solid ${colors.accent}` : `1px solid ${colors.border}`,
                    cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', backgroundColor: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme === 'dark' ? '#080808' : '#ffffff', fontWeight: 700, fontSize: '12px', flexShrink: 0,
                  }}>
                    {(r.full_name || r.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, color: colors.text, fontSize: '13px', fontWeight: 600 }}>{r.full_name || r.email}</p>
                    {r.full_name && <p style={{ margin: '2px 0 0 0', color: colors.textMuted, fontSize: '11px' }}>{r.email}</p>}
                  </div>
                  {selectedReviewerId === r.id && (
                    <div style={{ marginLeft: 'auto', color: colors.accent }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Optional: Comment */}
          <div style={{ marginBottom: '16px', marginTop: '4px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Comment <span style={{ color: colors.textMuted, fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={sendComment}
              onChange={e => setSendComment(e.target.value)}
              placeholder="Any notes or context for the reviewer…"
              rows={2}
              style={{
                width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderLight}`,
                color: colors.text, fontSize: '13px', padding: '10px 12px',
                fontFamily: 'Montserrat, sans-serif', resize: 'vertical',
                boxSizing: 'border-box', lineHeight: 1.5, outline: 'none',
              }}
            />
          </div>

          {/* Optional: URLs */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Latest/Staging URL <span style={{ color: colors.textMuted, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="url"
              value={latestUrl}
              onChange={e => setLatestUrl(e.target.value)}
              placeholder="https://staging.example.com"
              style={{
                width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderLight}`,
                color: colors.text, fontSize: '13px', padding: '10px 12px',
                fontFamily: 'Montserrat, sans-serif', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Live URL <span style={{ color: colors.textMuted, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="url"
              value={liveUrl}
              onChange={e => setLiveUrl(e.target.value)}
              placeholder="https://www.example.com"
              style={{
                width: '100%', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.borderLight}`,
                color: colors.text, fontSize: '13px', padding: '10px 12px',
                fontFamily: 'Montserrat, sans-serif', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          {sendError && (
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#ef4444' }}>{sendError}</p>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setStep('checklist')}
              style={{ flex: 1, padding: '14px', backgroundColor: 'transparent', border: `1px solid ${colors.borderLight}`, color: colors.textMuted, fontSize: '11px', fontWeight: 600, borderRadius: 10000, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif' }}
            >
              BACK
            </button>
            <button
              onClick={handleSendForReview}
              disabled={!selectedReviewerId || sending || reviewers.length === 0}
              style={{
                flex: 2, padding: '14px', backgroundColor: selectedReviewerId ? colors.accent : colors.bgTertiary,
                color: selectedReviewerId ? (theme === 'dark' ? '#080808' : '#ffffff') : colors.textMuted, border: 'none',
                fontSize: '11px', fontWeight: 600, borderRadius: 10000, textTransform: 'uppercase',
                cursor: selectedReviewerId ? 'pointer' : 'not-allowed', fontFamily: 'Montserrat, sans-serif',
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? 'SENDING…' : 'SEND FOR REVIEW'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CHECKLIST ──────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: colors.modalOverlay, zIndex: 1000, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Top toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: colors.bg,
        borderBottom: `1px solid ${colors.border}`, padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: '16px', height: '52px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', color: colors.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
          Revinok · Go-Live
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '340px', margin: '0 auto' }}>
          <div style={{ flex: 1, height: '3px', backgroundColor: colors.border, borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: colors.accent, width: `${pct}%`, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '10px', color: colors.textMuted, whiteSpace: 'nowrap', minWidth: '52px', textAlign: 'right' }}>
            {doneCount} / {total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            onClick={() => setStep('send')}
            style={{
              padding: '6px 16px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', borderRadius: 10000,
              letterSpacing: '0.1em', border: 'none', cursor: 'pointer',
              backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Send for Review →
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', borderRadius: 10000,
              letterSpacing: '0.1em', backgroundColor: 'transparent', border: `1px solid ${colors.borderLight}`,
              color: colors.textMuted, cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '40px auto 80px', padding: '0 24px', width: '100%' }}>
        {/* Header */}
        <div style={{ borderBottom: `2px solid ${colors.text}`, paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: colors.accent, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 8px 0' }}>
              Revinok · Webflow Protocol
            </p>
            <h1 style={{ color: colors.text, fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
              Go-Live Checklist
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase', margin: 0 }}>Internal Use Only</p>
            <p style={{ color: colors.text, fontSize: '16px', fontWeight: 700, margin: '4px 0 0 0' }}>{projectName}</p>
          </div>
        </div>

        {/* Progress hint */}
        {doneCount > 0 && doneCount < total && (
          <div style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, padding: '12px 16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: colors.accent }}>{pct}% complete</span>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>—</span>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>All items are optional. Click "Send for Review" when ready.</span>
          </div>
        )}

        {/* SECTION A */}
        <SectionBanner letter="SECTION A" title="Pre-Live Checks" items={items.filter(i => PRE_SECTIONS.includes(i.sectionNum))} />
        {PRE_SECTIONS.map(num => (
          <SectionGroup key={num} num={num} name={SECTION_NAMES[num]} items={groupedBySection[num]} onToggle={toggle} />
        ))}

        {/* SECTION B */}
        <SectionBanner letter="SECTION B" title="Post-Live Checks" items={items.filter(i => POST_SECTIONS.includes(i.sectionNum))} />
        {POST_SECTIONS.map(num => (
          <SectionGroup key={num} num={num} name={SECTION_NAMES[num]} items={groupedBySection[num]} onToggle={toggle} />
        ))}

        {/* Sign-off — reviewer auto-populated */}
        <div style={{ marginTop: '40px', borderTop: `2px solid ${colors.text}`, paddingTop: '20px' }}>
          <p style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px 0' }}>Sign-Off</p>
          <div>
            <label style={{ color: colors.textMuted, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '8px' }}>Reviewed By</label>
            <p style={{ margin: 0, color: colors.text, fontSize: '13px', borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '6px' }}>
              {currentUserName || 'You'}
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setStep('send')}
            style={{
              padding: '14px 32px', backgroundColor: colors.accent, color: theme === 'dark' ? '#080808' : '#ffffff', border: 'none', borderRadius: 10000,
              fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
              cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Send for Review →
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionBanner({ letter, title, items }: { letter: string; title: string; items: ChecklistItem[] }) {
  const { colors } = useTheme()
  const done = items.filter(i => i.done).length
  return (
    <div style={{ backgroundColor: colors.bgSecondary, padding: '10px 20px', margin: '32px 0 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ color: colors.textMuted, fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{letter}</span>
      <span style={{ color: colors.text, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</span>
      <span style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: '10px' }}>{done} / {items.length}</span>
    </div>
  )
}

function SectionGroup({ num, name, items, onToggle }: { num: string; name: string; items: ChecklistItem[]; onToggle: (id: string) => void }) {
  const { colors } = useTheme()
  const done = items.filter(i => i.done).length
  return (
    <div style={{ marginTop: '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0 10px', borderBottom: `1px solid ${colors.border}`, marginBottom: '2px' }}>
        <span style={{ color: colors.accent, fontSize: '10px', fontWeight: 700 }}>{num}</span>
        <span style={{ color: colors.text, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{name}</span>
        <span style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: '10px' }}>{done} / {items.length}</span>
      </div>
      {items.map(item => (
        <ChecklistRow key={item.id} item={item} onToggle={onToggle} />
      ))}
    </div>
  )
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle: (id: string) => void }) {
  const { colors } = useTheme()
  const tagStyle = TAG_COLORS[item.tag] || TAG_COLORS.design
  return (
    <div
      onClick={() => onToggle(item.id)}
      style={{
        display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'start', gap: '12px',
        padding: '10px 0', borderBottom: `1px solid ${colors.bgSecondary}`, cursor: 'pointer',
        opacity: item.done ? 0.6 : 1,
      }}
    >
      <div style={{
        width: '17px', height: '17px', border: '1.5px solid',
        borderColor: item.done ? colors.accent : colors.borderLight,
        backgroundColor: item.done ? colors.accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0,
        transition: 'all 0.15s',
      }}>
        {item.done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: 500, color: item.done ? colors.textMuted : colors.text, margin: 0, textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4 }}>
          {item.title}
        </p>
        <p style={{ fontSize: '11.5px', color: colors.textMuted, margin: '3px 0 0 0', lineHeight: 1.5 }}>{item.note}</p>
      </div>
      <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 7px', backgroundColor: tagStyle.bg, color: tagStyle.color, whiteSpace: 'nowrap', marginTop: '3px' }}>
        {tagStyle.label}
      </span>
    </div>
  )
}
