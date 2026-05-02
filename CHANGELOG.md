# Changelog

All notable changes to the Revinok Portal will be documented in this file.

Format: each entry includes the date, commit hash, and a summary of changes.

---

## [2026-05-01] — v5.4.1 (logo loading screen)

### Added
- **`src/app/loading.tsx`** — root-level loading screen with the Revinok logo (40px, pulsing). Replaces the black void users saw during the very first paint of any route. Uses the dark logo variant unconditionally because we can't read theme preference before hydration.
- **`src/app/dashboard/loading.tsx`** — same treatment for dashboard route transitions. Replaces the green CSS spinner.

### Why
First paint on staging looked like a broken/black page. The new loaders make it feel like the brand even before React hydrates.

---

## [2026-05-01] — v5.4.0 (Notion fallback cache)

### Added
- **`notion_tasks_cache` table** (migration 004) — persistent mirror of every Notion task. Acts as a fallback so the Tasks page never goes empty when Notion is slow or unreachable. Indexed on `assigned_to` and `project_notion_ids` (both GIN) and on `synced_at` for the freshness badge.
- **`notion_sync_meta` table** (singleton, migration 004) — tracks `last_synced_at`, `last_error_at`, and `last_error_message`. Powers the "✓ Synced 2m ago" / "⚠ Stale · 18m ago" badge on the Tasks page.
- **8-second timeout on every Notion API call** in `src/lib/actions/notion.ts` (`withTimeout` helper). Without this, a slow Notion can hang the request long enough that the user sees a blank page.
- **Write-through cache** in `fetchAllNotionTasks`, `fetchNotionTasksForProject`, and `syncNotionTasksNow`:
  - Admin/PM: full replace (propagates Notion deletions to the cache).
  - Other roles: partial upsert (won't wipe other users' rows from their narrower view).
  - Project detail: replace only that project's rows.
- **`getLastNotionSync()` server action** — returns the sync meta to render the freshness badge.

### Changed
- **`fetchAllNotionTasks` and `fetchNotionTasksForProject` no longer throw.** On Notion failure they record the error to `notion_sync_meta` and return whatever is in the cache. Callers can drop their try/catch.
- **Tasks page (`src/app/dashboard/tasks/page.tsx`)** — removed the unreachable "Notion is unreachable" failure block. Replaced with an inline status badge that turns orange when we're showing stale cache data.
- **`getTaskNotionComments` and `getTaskDescription`** wrapped in `withTimeout` — they fail closed (return empty) instead of hanging.

### Fixed
- **Duplicate task comments** — every comment was rendered twice in the task detail modal: once under "Notion Comments" (fetched live from Notion) and once under "Comments" (read from Supabase `task_comments`). Cause: `addTaskComment` writes through to both the local table and Notion, then both reads happen on render. Fix: removed the "Notion Comments" UI section in `TasksView.tsx`. The Notion write-through is preserved (so the conversation still surfaces in Notion for designers/PMs working there); the portal now shows a single Comments list backed by Supabase.

### Migration to apply
- `migrations/004_notion_tasks_cache.sql` — run in Supabase SQL Editor before deploying. The new code reads/writes these tables on every Tasks page render; missing tables = silent failures (cache reads return empty, writes are swallowed).

### Sync rule
- Sidebar version const, in-repo HANDOVER.md, and the external `Revinok_Portal_Handover_v5.docx` + README.md are all bumped to **5.4.0**.

---

## [2026-03-31] — 43aa809

### Fixed
- **Unread badge not clearing** — incoming messages in the open conversation are now marked as read immediately; conversations refresh on UPDATE events; `router.refresh()` syncs nav badge
- **Typing indicator false positives** — typing state now only broadcasts `typing: true` when input has at least one character; stops immediately on send or when input is cleared; uses stable channel ref instead of creating new channels per keystroke
- **Push notifications not firing** — moved notification listener from MessagesView (only mounted on messages page) to a global `NotificationListener` component in DashboardShell; fires browser notifications on any page when tab is unfocused, plus in-app toast when on a different page
- **Read receipts inconsistent** — `markMessagesAsRead` now uses the regular Supabase client (with RLS fallback to admin) so UPDATE events propagate through Realtime to the sender's subscription; set `REPLICA IDENTITY FULL` on messages table so UPDATE events include all columns

### Changed
- Send button styled uppercase bold (`SEND`, fontWeight 800, letterSpacing 0.5px)
- `markMessagesAsRead` now calls `revalidatePath` to bust server cache after marking

### SQL Migrations Applied
- `DROP/CREATE POLICY "Users can mark received messages as read"` — ensures UPDATE policy exists for regular client
- `ALTER TABLE messages REPLICA IDENTITY FULL` — enables full row data in Realtime UPDATE events

---

## [2026-03-31] — 75621e4

### Added
- **Delete confirmation** — clicking "delete" now shows a confirm/cancel prompt before actually deleting (prevents accidental mass deletion)
- **Typing indicator** — uses Supabase Presence to show a smooth "typing..." animation with bouncing dots when the other person is typing
- **Browser notifications** — requests permission on mount, sends desktop notifications for new messages when the tab is not focused
- **Error toast system** — `ToastProvider` wraps the dashboard; shows red/green/accent toast notifications that auto-dismiss after 4s; used for failed send and delete operations

### Changed
- Removed right-click context menu delete (it bypassed the confirmation dialog)

### Verified
- `SUPABASE_SERVICE_ROLE_KEY` is correctly set on Netlify — admin client operations confirmed working

---

## [2026-03-31] — 5d10a78

### Fixed
- **Conversations disappearing** — RLS SELECT policy on messages had `deleted_at IS NULL` filter, hiding soft-deleted messages from all queries; when all messages in a conversation were deleted, the conversation vanished entirely
- Switched `getConversations`, `getMessages`, and layout unread count to use admin client (bypasses RLS)
- Nav unread badge now updates immediately when opening a conversation (`router.refresh()` triggers layout re-render)

### Changed
- RLS SELECT policy on messages no longer filters by `deleted_at` — app layer handles deleted state with "This message was deleted" UI
- SQL migration `20260331_fix_messages_rls_select.sql` applied to production

---

## [2026-03-31] — a21ca2f (read receipts)

### Added
- Read receipts for messages — sent messages show "Read" label in accent color when receiver opens the conversation
- `markMessagesAsRead` server action — marks all unread messages from a sender as read when opening their conversation
- SQL migration file at `supabase/migrations/20260331_add_read_at_to_messages.sql` — **must be run in Supabase SQL Editor**

### Fixed
- Message deletion now uses admin client to bypass RLS policies (was silently failing)
- Nav menu unread message count now only counts messages where `read_at IS NULL` (was counting ALL received messages)
- Delete button hover now uses explicit `#ef4444` red instead of `colors.danger` (which may be undefined)

---

## [2026-03-31] — 99f99e1

### Fixed
- Message delete now works — `softDeleteMessage` nulls content and verifies update via `.select()`
- Fixed broken `startDeleteTimer` function (renamed to `clearDeleteTimer`, was clearing timers instead of starting them)

### Changed
- Conversations now sorted by latest message time (newest first) — both server-side and after sending
- Active conversation moves to top immediately after sending a message

### Added
- Navigation loading bar (thin accent-colored progress bar at top of screen during page transitions)
- CSS transitions for smoother button/link hover states and page fade-in animation

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
