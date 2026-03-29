-- Migration 003: Task Comments, Notifications, Launch Reviews
-- Run this in Supabase SQL Editor

-- ─── task_comments ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_notion_id text NOT NULL,
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth can read task_comments"   ON task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth can insert task_comments" ON task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type         text NOT NULL,
  -- 'launch_review_request' | 'launch_approved' | 'launch_declined'
  project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
  data         jsonb DEFAULT '{}',
  is_read      boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipients can read own notifications"
  ON notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "auth can insert notifications"
  ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "recipients can update own notifications"
  ON notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- ─── launch_reviews ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS launch_reviews (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  submitted_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status         text DEFAULT 'pending',
  -- 'pending' | 'approved' | 'declined'
  checklist_data jsonb,
  decline_message text,
  reviewed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE launch_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth can read launch_reviews"
  ON launch_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth can insert launch_reviews"
  ON launch_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "reviewers and submitters can update launch_reviews"
  ON launch_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id OR auth.uid() = submitted_by);

SELECT 'Migration 003 complete' AS status;
