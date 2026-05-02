-- Migration 006: Tighten RLS — security pass before client portal
--
-- WHY
-- The 003 migration created task_comments and launch_reviews with
-- SELECT USING (true), which is fine for an all-team portal but becomes a
-- data leak the moment a `client` role logs in: a client would see every
-- task comment and launch review across every project. The notifications
-- INSERT policy similarly only checks sender_id = auth.uid(), so any
-- authenticated user could spam any other user's notification feed. This
-- migration scopes those reads/writes to project membership and adds a
-- defensive profiles SELECT policy that restricts what clients can read.
--
-- SAFE FOR EXISTING USERS
-- All current users are admin / project_manager / designer / developer /
-- designer_dev / viewer — no client accounts exist yet. The new policies
-- preserve current behaviour for those roles (admin/PM see everything;
-- everyone else sees their member projects). The only "new" behaviour
-- kicks in once a client role logs in.
--
-- Run this in the Supabase SQL Editor.

-- ─── task_comments SELECT ────────────────────────────────────────────────
-- Was: USING (true). Now: project members + author + admin/PM.
DROP POLICY IF EXISTS "auth can read task_comments" ON task_comments;
DROP POLICY IF EXISTS "task_comments_select" ON task_comments;
CREATE POLICY "task_comments_select" ON task_comments
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
    OR
    project_id IN (SELECT project_id FROM project_members WHERE profile_id = auth.uid())
    OR
    author_id = auth.uid()
  );

-- ─── launch_reviews SELECT ───────────────────────────────────────────────
-- Was: USING (true). Now: project members + submitter + reviewer + admin/PM.
DROP POLICY IF EXISTS "auth can read launch_reviews" ON launch_reviews;
DROP POLICY IF EXISTS "launch_reviews_select" ON launch_reviews;
CREATE POLICY "launch_reviews_select" ON launch_reviews
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
    OR
    project_id IN (SELECT project_id FROM project_members WHERE profile_id = auth.uid())
    OR
    submitted_by = auth.uid()
    OR
    reviewer_id = auth.uid()
  );

-- ─── notifications INSERT ────────────────────────────────────────────────
-- Was: WITH CHECK (auth.uid() = sender_id). Allowed any auth'd user to
-- insert a notification with any recipient — i.e. spam anyone in the system.
-- Now: sender must be admin/PM, OR sender and recipient must share a
-- project. System notifications (sender_id IS NULL) come in via the admin
-- client (service role) which bypasses RLS, so this policy doesn't apply
-- to them.
DROP POLICY IF EXISTS "auth can insert notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
      OR
      EXISTS (
        SELECT 1
        FROM project_members me
        JOIN project_members them ON me.project_id = them.project_id
        WHERE me.profile_id = auth.uid()
          AND them.profile_id = recipient_id
      )
    )
  );

-- ─── profiles SELECT ─────────────────────────────────────────────────────
-- The implicit/default policy in this workspace lets every authenticated
-- user read every profile row. Once clients can log in, that means a client
-- can list every other client's email + every team member. Restrict:
--   * Always see your own row (required for the role-lookup pattern that
--     many other policies depend on).
--   * Admin/PM see all profiles.
--   * Non-client users (designer/developer/viewer/etc) see all NON-client
--     profiles — needed for assignee name resolution etc.
--   * Clients see only their own profile + admin/PM profiles (so they have
--     a contact path).
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    -- Always see self (also keeps role-lookup policies working)
    id = auth.uid()
    OR
    -- Admin/PM see everyone
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
    OR
    -- Non-client team members see other team members (not other clients)
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) != 'client'
      AND profiles.role != 'client'
    )
    OR
    -- Clients can see admin/PM contact rows
    profiles.role IN ('admin', 'project_manager')
  );

SELECT 'Migration 006 complete' AS status;
