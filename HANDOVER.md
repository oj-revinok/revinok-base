# Revinok Portal — Developer Handover

Last updated: 2026-05-01 (v5.4.0)

## Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Presence, Storage)
- **Hosting**: Netlify (auto-deploy from `main` branch, ~55-60s builds)
- **Styling**: Inline styles with ThemeContext (dark/light mode), Montserrat font

## Key URLs

- **Live site**: https://revinok-base.netlify.app
- **Supabase project**: `kukfjeyazncmqrynbkyg` (West EU / Ireland)
- **GitHub repo**: https://github.com/oj-revinok/revinok-base

## Architecture Notes

### Auth & Server Components
Every page that uses Supabase auth **must** have `export const dynamic = 'force-dynamic'`. ISR (`revalidate`) breaks auth because pages render without session cookies.

### Admin Client
`createAdminClient()` (from `@/lib/supabase/admin`) bypasses Row-Level Security using `SUPABASE_SERVICE_ROLE_KEY`. It's used for:
- `getConversations()` and `getMessages()` — need to see soft-deleted messages (to show "This message was deleted")
- Dashboard layout unread count — bypasses RLS `deleted_at` filter
- `softDeleteMessage()` — verifies ownership via `sender_id` check

**Critical**: If `SUPABASE_SERVICE_ROLE_KEY` is missing on Netlify, messaging breaks entirely.

### Realtime & Presence
- **Messages channel** (`postgres_changes` on `messages` table): handles INSERT (new messages) and UPDATE (read receipts, deletions) events
- **Typing channel** (`typing:{sorted_user_ids}`): uses Supabase Presence to broadcast typing state between two users
- **Global notifications** (`global-notifications`): `NotificationListener` component in `DashboardShell` subscribes to all INSERTs for the current user — fires browser notifications on any page
- **Replica identity**: `messages` table has `REPLICA IDENTITY FULL` so UPDATE events include all columns (needed for read receipt propagation)

### Messaging Architecture
- Messages use **soft delete** — `deleted_at` is set, `content` nulled, UI shows "This message was deleted"
- `markMessagesAsRead()` uses the **regular client first** (so Realtime picks up the UPDATE) with admin client as fallback
- Unread badge in nav is server-rendered in `dashboard/layout.tsx`; client calls `router.refresh()` to sync it
- Typing indicator only activates when input has actual text; stops on send or empty input

### Toast System
`ToastProvider` wraps the dashboard in `DashboardShell`. Any component can call `useToast().showToast(text, type)` for error/success/info notifications.

### Notion Tasks — Fallback Cache (added in 5.4.0)
Tasks live in Notion, not Supabase, so when Notion is slow or down the Tasks page used to render an empty kanban. The fix is a write-through cache.

- Two tables in Postgres: `notion_tasks_cache` (full mirror, one row per Notion page) and `notion_sync_meta` (singleton row, tracks `last_synced_at` + `last_error_at` + `last_error_message`).
- All Notion calls in `src/lib/actions/notion.ts` are wrapped in `withTimeout(..., 8000)` so a slow Notion can't hang the page.
- `fetchAllNotionTasks` / `fetchNotionTasksForProject` no longer throw. They try Notion first, write through to the cache on success, and fall back to the cache on any failure (including timeout).
- The Tasks page reads `getLastNotionSync()` and renders a small badge: green "✓ Synced 2m ago" when the last sync succeeded, orange "⚠ Stale · 18m ago" when the last error is more recent than the last success and within the last 30 minutes.
- Cache-write strategy:
  - Admin/PM (sees the full task set) → full replace (`replaceAllTasksInCache`). Propagates Notion deletions.
  - Other roles (sees only their own slice) → upsert without delete (`upsertPartialTasksInCache`) so we don't wipe rows visible only to admins.
  - Single-project page → `replaceProjectTasksInCache` deletes only that project's stale rows.
- `syncNotionTasksNow()` (the existing manual-refresh server action) now also force-refreshes the cache after busting the in-memory `unstable_cache` tag.

If the migration hasn't run yet, every cache read returns empty and every cache write is swallowed silently — the page degrades to live-only behavior with no error, but you also get no fallback. So make sure `004_notion_tasks_cache.sql` is applied.

## Database: Key RLS Policies on `messages`

| Policy | Type | Rule |
|--------|------|------|
| Users can see their own messages | SELECT | `auth.uid() = sender_id OR auth.uid() = receiver_id` |
| Users can mark received messages as read | UPDATE | `receiver_id = auth.uid()` |

The SELECT policy does **not** filter by `deleted_at` — that's handled in the app layer.

## SQL Migrations

All in `supabase/migrations/` and `migrations/`. Run manually in Supabase SQL Editor:

1. `20260331_add_read_at_to_messages.sql` — adds `read_at` column, index, and UPDATE policy
2. `20260331_fix_messages_rls_select.sql` — removes `deleted_at IS NULL` from SELECT policy
3. `20260331_ensure_read_at_update_policy.sql` — ensures UPDATE policy for regular client usage
4. `20260331_enable_realtime_full_replica.sql` — `REPLICA IDENTITY FULL` for Realtime UPDATE events
5. `migrations/001_update_roles_and_create_users.sql` — role constraint, `notion_person_id` on profiles, project RLS
6. `migrations/002_app_settings.sql` — app-wide key/value settings table
7. `migrations/003_notifications.sql` — task_comments, notifications, launch_reviews
8. `migrations/004_notion_tasks_cache.sql` — Notion fallback cache (`notion_tasks_cache`, `notion_sync_meta`)

Through `003`: applied to production. **`004`: not yet applied — must run before deploying 5.4.0.**

## Key Files

| File | Purpose |
|------|---------|
| `src/components/MessagesView.tsx` | Main messaging UI — conversations, messages, typing, delete confirmation |
| `src/components/NotificationListener.tsx` | Global browser notification listener (mounted in DashboardShell) |
| `src/components/Toast.tsx` | ToastProvider context + animated toast UI |
| `src/components/DashboardShell.tsx` | Client wrapper for dashboard — theme, toasts, notification listener |
| `src/lib/actions/messages.ts` | Server actions: getConversations, getMessages, sendMessage, softDeleteMessage, markMessagesAsRead |
| `src/lib/supabase/admin.ts` | Admin client (bypasses RLS) |
| `src/app/dashboard/layout.tsx` | Server layout — fetches unread counts, profile, renders sidebar |

## Recent Changes (2026-03-31)

- Fixed conversations disappearing after deleting all messages (RLS + admin client)
- Added read receipts (read_at column, "Read" label on sent messages)
- Added delete confirmation (two-click: delete > confirm/cancel)
- Added typing indicator (Supabase Presence, bouncing dots)
- Added browser notifications (global listener, works on any page)
- Added error toast system (auto-dismiss, click-to-dismiss)
- Fixed unread badge not clearing when viewing messages
- Fixed typing indicator showing without any text typed
- Fixed read receipts not propagating in real-time (regular client + REPLICA IDENTITY FULL)
- Send button styled uppercase bold

## Gotchas

- Don't use `revalidate` (ISR) on auth-dependent pages — use `force-dynamic`
- The admin client is intentionally used for reads that need to see deleted messages
- Typing indicator uses a stable channel ref (`presenceChannelRef`) — creating new channels per keystroke causes duplication
- `markMessagesAsRead` uses the regular client first so Realtime delivers UPDATE events to the sender (admin client bypasses Realtime)
- Supabase free tier: the project may pause after inactivity. If the site stops working, check if the Supabase project needs to be resumed.
