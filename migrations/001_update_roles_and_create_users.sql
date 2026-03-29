-- ============================================================
-- REVINOK — Migration 001
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Update role constraint to allow 'designer' and 'developer' ──
-- First drop any existing check constraint on profiles.role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add updated constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'project_manager', 'designer', 'developer', 'designer_dev', 'viewer', 'client'));

-- ── 2. Add notion_person_id column to profiles (for task filtering) ──
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notion_person_id text DEFAULT NULL;

-- ── 3. Add is_launch_checklist to project_files ──
ALTER TABLE project_files
  ADD COLUMN IF NOT EXISTS is_launch_checklist boolean DEFAULT false;

-- ── 4. Create the 4 new team members ──
-- Note: Supabase creates auth users via the Admin API, not SQL.
-- Use the Supabase Dashboard → Authentication → Users → "Add user"
-- OR run the create-users script: node scripts/create-users.mjs (requires network)
--
-- Credentials to create:
-- Email: ux@revinok.com        | Password: Abishek2026!  | Role: designer
-- Email: dp@revinok.com        | Password: Danula2026!   | Role: designer
-- Email: sdushan@revinok.com   | Password: Sadeepa2026!  | Role: developer
-- Email: kg@revinok.com        | Password: Kalhara2026!  | Role: developer

-- ── 5. RLS: Project visibility based on membership ──
-- Allow users to see projects they are members of

-- Drop old policy if it exists
DROP POLICY IF EXISTS "Users can see their projects" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;

-- Create new policy: admin/PM see all; others see their membership projects
CREATE POLICY "projects_select" ON projects
  FOR SELECT
  USING (
    -- Admin and PMs see everything
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
    OR
    -- Others see projects they're a member of
    id IN (
      SELECT project_id FROM project_members WHERE profile_id = auth.uid()
    )
    OR
    -- Creators always see their own projects
    created_by = auth.uid()
  );

-- ── 6. RLS: project_members ──
DROP POLICY IF EXISTS "project_members_select" ON project_members;
CREATE POLICY "project_members_select" ON project_members
  FOR SELECT
  USING (true); -- Anyone in the app can see who's in projects they have access to

DROP POLICY IF EXISTS "project_members_insert" ON project_members;
CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
  );

DROP POLICY IF EXISTS "project_members_delete" ON project_members;
CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
  );

-- ── 7. RLS: Protect notes and files deletion ──
DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
  );

DROP POLICY IF EXISTS "project_files_delete" ON project_files;
CREATE POLICY "project_files_delete" ON project_files
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'project_manager')
  );

-- ── Done ──
SELECT 'Migration 001 complete' as status;
