-- User activity log for portal access tracking
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL DEFAULT 'page_view',
  page text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ual_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ual_created_at ON user_activity_log(created_at DESC);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can log own activity"
  ON user_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins and PMs can read all; others can only read their own
CREATE POLICY "Admins can read all activity"
  ON user_activity_log FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager')
    )
  );