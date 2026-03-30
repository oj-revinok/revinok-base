-- Add read receipts to messages
-- Run this in the Supabase SQL Editor: Dashboard > SQL Editor > New query

ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz DEFAULT NULL;

-- Index for efficient unread count queries
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read_at
  ON messages (receiver_id, read_at)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- Allow users to update read_at on messages they received
-- (Adjust or skip if you already have an UPDATE policy that covers this)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'messages' AND policyname = 'Users can mark received messages as read'
  ) THEN
    CREATE POLICY "Users can mark received messages as read"
      ON messages FOR UPDATE
      USING (receiver_id = auth.uid())
      WITH CHECK (receiver_id = auth.uid());
  END IF;
END $$;
