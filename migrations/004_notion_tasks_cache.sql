-- Migration 004: Notion tasks fallback cache
--
-- Why: when Notion API is slow or down, the tasks page used to render an
-- empty kanban ("0 tasks / No tasks found") because the in-memory
-- unstable_cache had no fallback. This adds a persistent mirror in Postgres
-- so the UI always has the last-known-good data to render.
--
-- Pattern: write-through cache.
--   1. fetchAllNotionTasks tries Notion (with timeout).
--   2. On success: replace the cache, bump notion_sync_meta.last_synced_at, return live data.
--   3. On failure: return whatever is in the cache, record last_error_at + message.
--
-- Run this in the Supabase SQL Editor.

-- ─── notion_tasks_cache ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notion_tasks_cache (
  id                  text PRIMARY KEY,            -- Notion page ID
  name                text NOT NULL,
  status              text NOT NULL DEFAULT 'Not started',
  priority            text,
  due_date            date,
  assigned_to         text[] NOT NULL DEFAULT '{}', -- Notion person IDs
  tags                text[] NOT NULL DEFAULT '{}',
  project_notion_ids  text[] NOT NULL DEFAULT '{}',
  notion_url          text NOT NULL,
  synced_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notion_tasks_cache_assigned_to_idx
  ON notion_tasks_cache USING GIN (assigned_to);

CREATE INDEX IF NOT EXISTS notion_tasks_cache_project_idx
  ON notion_tasks_cache USING GIN (project_notion_ids);

CREATE INDEX IF NOT EXISTS notion_tasks_cache_synced_at_idx
  ON notion_tasks_cache (synced_at DESC);

ALTER TABLE notion_tasks_cache ENABLE ROW LEVEL SECURITY;

-- Read: any authenticated user. Filtering is handled in the server action
-- based on role + notion_person_id (same as the live Notion query).
CREATE POLICY "auth can read notion_tasks_cache"
  ON notion_tasks_cache FOR SELECT TO authenticated USING (true);

-- Write: any authenticated user. The cache is derived from the admin's
-- Notion API key and is fully replaceable on each successful sync, so a bad
-- write self-heals on the next refresh. Tighten when role-aware writes are
-- added in the security pass.
CREATE POLICY "auth can write notion_tasks_cache"
  ON notion_tasks_cache FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── notion_sync_meta ───────────────────────────────────────────────────────
-- Single-row table tracking the last successful sync and the last error.
-- We track these separately from MAX(synced_at) because an empty result is
-- still a successful sync (Notion answered, it just had nothing to return).
CREATE TABLE IF NOT EXISTS notion_sync_meta (
  id                  int PRIMARY KEY DEFAULT 1,
  last_synced_at      timestamptz,
  last_error_at       timestamptz,
  last_error_message  text,
  CONSTRAINT notion_sync_meta_singleton CHECK (id = 1)
);

INSERT INTO notion_sync_meta (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE notion_sync_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth can read notion_sync_meta"
  ON notion_sync_meta FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth can write notion_sync_meta"
  ON notion_sync_meta FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

SELECT 'Migration 004 complete' AS status;
