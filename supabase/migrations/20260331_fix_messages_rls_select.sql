-- Fix messages SELECT RLS policy
-- The original policy filtered out soft-deleted messages (deleted_at IS NULL),
-- which caused entire conversations to disappear when all messages were deleted.
-- The app layer handles deleted messages by showing "This message was deleted".
-- Run this in the Supabase SQL Editor: Dashboard > SQL Editor > New query

-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can see their own messages" ON messages;

-- Create new SELECT policy WITHOUT the deleted_at filter
-- This lets the app show "This message was deleted" while keeping conversations visible
CREATE POLICY "Users can see their own messages"
ON messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
