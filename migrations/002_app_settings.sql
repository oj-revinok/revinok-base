-- Migration 002: App settings table + clear projects for fresh start
-- Run this in Supabase SQL Editor

-- ─── STEP 1: Clear all projects (fresh start) ──────────────────────────────
-- This deletes all projects and their related data (cascade)
TRUNCATE TABLE projects CASCADE;

-- ─── STEP 2: Create app_settings table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key   text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Insert default sync interval (1 hour)
INSERT INTO app_settings (key, value)
VALUES ('notion_sync_interval_hours', '1')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "authenticated users can read app_settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can write settings
CREATE POLICY "admins can write app_settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Done
SELECT 'Migration 002 complete' AS status;
