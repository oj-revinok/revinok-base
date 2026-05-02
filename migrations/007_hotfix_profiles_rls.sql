-- Migration 007: HOTFIX — restore permissive profiles SELECT
--
-- The 5.6.0 profiles_select policy used a recursive subquery
-- `(SELECT role FROM profiles WHERE id = auth.uid())` inside its USING
-- clause, which Postgres evaluated under the policy's own RLS — causing
-- every profile read to return empty, including the user reading their
-- own row. Effect: every logged-in user appeared as `viewer` (default
-- fallback in the app) and lost any admin/PM tabs.
--
-- Fix: restore the simple "any authenticated user can read profiles"
-- policy. We'll revisit profile-level scoping when we actually onboard a
-- client account, using a SECURITY DEFINER function for the role lookup
-- so it can't recurse.
--
-- Run this in the Supabase SQL Editor.

DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select_authenticated" ON profiles
  FOR SELECT TO authenticated
  USING (true);

SELECT 'Migration 007 (profiles RLS hotfix) complete' AS status;
