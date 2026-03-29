'use client'

import { useState } from 'react'
import { saveLaunchChecklistToFiles } from '@/lib/actions/projects'

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

interface Props {
  projectId: string
  projectName: string
  onClose: () => void
}

export default function LaunchChecklist({ projectId, projectName, onClose }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_ITEMS.map(item => ({ ...item, done: false }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reviewer, setReviewer] = useState('')
  const [projectLead, setProjectLead] = useState('')

  const total = items.length
  const doneCount = items.filter(i => i.done).length
  const allDone = doneCount === total
  const pct = Math.round((doneCount / total) * 100)

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const checklistData = {
        projectId,
        projectName,
        completedAt: new Date().toISOString(),
        reviewer,
        projectLead,
        progress: { done: doneCount, total },
        items: items.map(({ id, sectionNum, section, title, done }) => ({ id, sectionNum, section, title, done })),
      }
      await saveLaunchChecklistToFiles(projectId, JSON.stringify(checklistData, null, 2), projectName)
      setSaved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const groupedBySection = SECTIONS_ORDER.reduce((acc, num) => {
    acc[num] = items.filter(i => i.sectionNum === num)
    return acc
  }, {} as Record<string, ChecklistItem[]>)

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 1000,
      display: 'flex', flexDirection: 'column', overflowY: 'auto'
    }}>
      {/* Top toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#080808',
        borderBottom: '1px solid #1a1a1a', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: '16px', height: '52px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '10px', color: '#555555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
          Revinok · Go-Live
        </span>
        {/* Progress bar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '340px', margin: '0 auto' }}>
          <div style={{ flex: 1, height: '3px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: '#BDD630', width: `${pct}%`, transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: '10px', color: '#555555', whiteSpace: 'nowrap', minWidth: '52px', textAlign: 'right' }}>
            {doneCount} / {total}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {!saved && (
            <button
              onClick={handleSave}
              disabled={saving || !allDone}
              title={!allDone ? 'Complete all items to save' : 'Save to project files'}
              style={{
                padding: '6px 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', border: 'none', cursor: allDone ? 'pointer' : 'not-allowed',
                backgroundColor: allDone ? '#BDD630' : '#1a1a1a', color: allDone ? '#080808' : '#444444',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {saving ? 'Saving…' : 'Save to Files'}
            </button>
          )}
          {saved && (
            <span style={{ padding: '6px 16px', fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
              ✓ Saved
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', backgroundColor: 'transparent', border: '1px solid #333',
              color: '#555555', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '40px auto 80px', padding: '0 24px', width: '100%' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #ffffff', paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#BDD630', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 8px 0' }}>
              Revinok · Webflow Protocol
            </p>
            <h1 style={{ color: '#ffffff', fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
              Go-Live Checklist
            </h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#555555', fontSize: '10px', textTransform: 'uppercase', margin: 0 }}>Internal Use Only</p>
            <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, margin: '4px 0 0 0' }}>{projectName}</p>
          </div>
        </div>

        {/* All done banner */}
        {allDone && (
          <div style={{ backgroundColor: '#051a0a', border: '1px solid #4ade80', padding: '14px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '22px', height: '22px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <div>
              <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, margin: 0 }}>All items complete — ready to launch.</p>
              <p style={{ color: '#4ade80', fontSize: '11px', margin: '2px 0 0 0', opacity: 0.7 }}>Click "Save to Files" to attach this checklist to the project.</p>
            </div>
          </div>
        )}

        {/* SECTION A */}
        <SectionBanner letter="SECTION A" title="Pre-Live Checks" items={items.filter(i => PRE_SECTIONS.includes(i.sectionNum))} />

        {PRE_SECTIONS.map(num => (
          <SectionGroup
            key={num}
            num={num}
            name={SECTION_NAMES[num]}
            items={groupedBySection[num]}
            onToggle={toggle}
          />
        ))}

        {/* SECTION B */}
        <SectionBanner letter="SECTION B" title="Post-Live Checks" items={items.filter(i => POST_SECTIONS.includes(i.sectionNum))} />

        {POST_SECTIONS.map(num => (
          <SectionGroup
            key={num}
            num={num}
            name={SECTION_NAMES[num]}
            items={groupedBySection[num]}
            onToggle={toggle}
          />
        ))}

        {/* Sign-off */}
        <div style={{ marginTop: '40px', borderTop: '2px solid #ffffff', paddingTop: '20px' }}>
          <p style={{ color: '#555555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 16px 0' }}>Sign-Off</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {[
              { label: 'Reviewed By', value: reviewer, onChange: setReviewer },
              { label: 'Project Lead', value: projectLead, onChange: setProjectLead },
            ].map(f => (
              <div key={f.label}>
                <label style={{ color: '#555555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: '8px' }}>{f.label}</label>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => f.onChange(e.target.value)}
                  placeholder="Name"
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid #333333', outline: 'none',
                    backgroundColor: 'transparent', color: '#ffffff', fontSize: '13px', padding: '6px 0',
                    fontFamily: 'Montserrat, sans-serif', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionBanner({ letter, title, items }: { letter: string; title: string; items: ChecklistItem[] }) {
  const done = items.filter(i => i.done).length
  return (
    <div style={{ backgroundColor: '#111111', padding: '10px 20px', margin: '32px 0 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ color: '#444444', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{letter}</span>
      <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{title}</span>
      <span style={{ marginLeft: 'auto', color: '#444444', fontSize: '10px' }}>{done} / {items.length}</span>
    </div>
  )
}

function SectionGroup({ num, name, items, onToggle }: { num: string; name: string; items: ChecklistItem[]; onToggle: (id: string) => void }) {
  const done = items.filter(i => i.done).length
  return (
    <div style={{ marginTop: '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0 10px', borderBottom: '1px solid #1a1a1a', marginBottom: '2px' }}>
        <span style={{ color: '#BDD630', fontSize: '10px', fontWeight: 700 }}>{num}</span>
        <span style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{name}</span>
        <span style={{ marginLeft: 'auto', color: '#444444', fontSize: '10px' }}>{done} / {items.length}</span>
      </div>
      {items.map(item => (
        <ChecklistRow key={item.id} item={item} onToggle={onToggle} />
      ))}
    </div>
  )
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle: (id: string) => void }) {
  const tagStyle = TAG_COLORS[item.tag] || TAG_COLORS.design
  return (
    <div
      onClick={() => onToggle(item.id)}
      style={{
        display: 'grid', gridTemplateColumns: '26px 1fr auto', alignItems: 'start', gap: '12px',
        padding: '10px 0', borderBottom: '1px solid #111111', cursor: 'pointer',
        opacity: item.done ? 0.6 : 1,
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: '17px', height: '17px', border: '1.5px solid',
        borderColor: item.done ? '#4ade80' : '#333333',
        backgroundColor: item.done ? '#4ade80' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', flexShrink: 0,
        transition: 'all 0.15s',
      }}>
        {item.done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#080808" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      {/* Content */}
      <div>
        <p style={{
          fontSize: '13px', fontWeight: 500, color: item.done ? '#555555' : '#ffffff', margin: 0,
          textDecoration: item.done ? 'line-through' : 'none', lineHeight: 1.4,
        }}>
          {item.title}
        </p>
        <p style={{ fontSize: '11.5px', color: '#444444', margin: '3px 0 0 0', lineHeight: 1.5 }}>{item.note}</p>
      </div>
      {/* Tag */}
      <span style={{
        fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        padding: '3px 7px', backgroundColor: tagStyle.bg, color: tagStyle.color, whiteSpace: 'nowrap', marginTop: '3px',
      }}>
        {tagStyle.label}
      </span>
    </div>
  )
}
