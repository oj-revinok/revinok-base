# Changelog

All notable changes to the Revinok Portal will be documented in this file.

Format: each entry includes the date, commit hash, and a summary of changes.

---

## [2026-03-31] — ab6436a

### Fixed
- Restored `force-dynamic` on projects list, project detail, and tasks pages — ISR `revalidate` broke Supabase auth by rendering without session cookies
- Fixed `.tag` CSS rule in globals.css — was `border-radius: 0 !important`, changed to `border-radius: 10000px !important` so filter tabs and status badges render as pills

---

## [2026-03-30] — 9439149

### Changed
- Renamed "Add Client" to "Onboard Client" across button, modal title, success/error messages
- Removed icons from project link labels: "Live Site" instead of "↗ Live Site", "Staging" instead of "⚙ Staging", "Figma" instead of "✦ Figma", "Notion" instead of "☰ Notion"
- Project managers can now delete projects (was admin-only)

### Fixed
- TipTap rich text editor now clears after saving a note (added useEffect to call `editor.commands.clearContent()` when content prop becomes empty)

---

## [2026-03-30] — bc97412

### Changed
- Project card status badge moved to top-right corner (absolute positioned)
- Project card title increased to 22px
- Project card footer shows member/note counts as text (no emojis)
- Clients sidebar icon changed from home to briefcase SVG
- AddClientModal input fields given borderRadius: 12

---

## [2026-03-30] — 8139f82

### Added
- Delete project functionality with cascade delete (admin + PM only)
- Loading skeleton for project detail page (`loading.tsx`)

### Changed
- Activity log query limited to 50 entries
- Dashboard layout profile query optimized to select only needed columns

---

## [2026-03-30] — 6a79bd0

### Fixed
- Note previews no longer show raw HTML — tags stripped with regex
- LaunchChecklist overlay changed from transparent to solid background

---

## [2026-03-30] — 7fa7eb1

### Fixed
- Duplicate borderRadius in GroupModal causing build failure

---

## [2026-03-30] — 3bb99de

### Fixed
- Messages: removed role display from header, fixed duplicate message on send
- Border-radius standardized across multiple components
- Feedback tab removed from DashboardShell
- Notes content panel fixed to full width

---

## [2026-03-30] — 2d6b38e

### Fixed
- Restored full messages page with MessagesView component
