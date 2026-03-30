-- Ensure UPDATE policy exists for marking messages as read via regular client
-- This is needed so Supabase Realtime picks up the changes and delivers them
-- to the sender's subscription (for read receipts to work in real-time).
-- Run this in the Supabase SQL Editor: Dashboard > SQL Editor > New query

DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;

CREATE POLICY "Users can mark received messages as read"
  ON messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());
