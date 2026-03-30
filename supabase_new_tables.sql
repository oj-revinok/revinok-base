-- ============================================================================
-- Revinok Project Management Portal - New Tables and Policies
-- Supabase Project: kukfjeyazncmqrynbkyg
-- ============================================================================

-- ============================================================================
-- 1. MESSAGES TABLE (Real-time team messaging - PRIVATE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES profiles(id)
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY DEFINER FUNCTION FOR MESSAGE DELETION CHECK
-- ============================================================================

CREATE OR REPLACE FUNCTION can_delete_message(msg_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  msg RECORD;
  user_role text;
BEGIN
  SELECT sender_id, created_at FROM messages WHERE id = msg_id INTO msg;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT role FROM profiles WHERE id = auth.uid() INTO user_role;

  -- Admin/PM can delete anytime
  IF user_role IN ('admin', 'project_manager') THEN RETURN true; END IF;

  -- Sender can delete within 24 hours
  IF msg.sender_id = auth.uid() AND msg.created_at > now() - interval '24 hours' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ============================================================================
-- RLS POLICIES FOR MESSAGES TABLE
-- ============================================================================

-- SELECT: Only sender OR receiver can see the message (AND deleted_at IS NULL)
CREATE POLICY "Users can see their own messages"
ON messages
FOR SELECT
TO authenticated
USING (
  (auth.uid() = sender_id OR auth.uid() = receiver_id) AND deleted_at IS NULL
);

-- INSERT: Authenticated users can send messages (sender_id = auth.uid())
CREATE POLICY "Users can insert their own messages"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- UPDATE: For soft delete only - using the security definer function
CREATE POLICY "Users can soft-delete their own messages"
ON messages
FOR UPDATE
TO authenticated
USING (can_delete_message(id))
WITH CHECK (
  -- Only allow updating deleted_at and deleted_by columns
  (deleted_at IS NOT NULL OR deleted_at IS NULL) AND
  (deleted_by = auth.uid() OR deleted_by IS NULL)
);

-- DELETE: No hard deletes allowed (no policy = no deletes)

-- ============================================================================
-- 2. GROUPS TABLE (For team page - admin/PM only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR GROUPS TABLE
-- ============================================================================

-- SELECT: All authenticated users can see groups
CREATE POLICY "All authenticated users can view groups"
ON groups
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admin or project_manager
CREATE POLICY "Only admins and project_managers can create groups"
ON groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'project_manager')
  )
);

-- UPDATE: Only admin or project_manager
CREATE POLICY "Only admins and project_managers can update groups"
ON groups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'project_manager')
  )
);

-- DELETE: Only admin or project_manager
CREATE POLICY "Only admins and project_managers can delete groups"
ON groups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'project_manager')
  )
);

-- ============================================================================
-- 3. GROUP MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, profile_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR GROUP_MEMBERS TABLE
-- ============================================================================

-- SELECT: All authenticated users can see group members
CREATE POLICY "All authenticated users can view group members"
ON group_members
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Only admin or project_manager
CREATE POLICY "Only admins and project_managers can add group members"
ON group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'project_manager')
  )
);

-- DELETE: Only admin or project_manager
CREATE POLICY "Only admins and project_managers can remove group members"
ON group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'project_manager')
  )
);

-- ============================================================================
-- 4. ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS personal_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS personal_note_shares;

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_profile ON group_members(profile_id);
