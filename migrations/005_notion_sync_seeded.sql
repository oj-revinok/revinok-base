-- Migration 005: seeded_at flag on notion_sync_meta
--
-- Why: when the cache is empty (first ever sync), every task in Notion looks
-- like a brand-new assignment to its current assignees, which would spam every
-- portal user with notifications for every existing task. We need a way to say
-- "this is the seed sync — populate the cache silently, don't notify."
--
-- Pattern: emit task_assigned notifications only AFTER seeded_at is set.
-- The first admin/PM sync sets seeded_at and skips emissions; every sync after
-- that diffs against a real prior state and notifies normally.
--
-- Run this in the Supabase SQL Editor.

ALTER TABLE notion_sync_meta
  ADD COLUMN IF NOT EXISTS seeded_at timestamptz;

SELECT 'Migration 005 complete' AS status;
