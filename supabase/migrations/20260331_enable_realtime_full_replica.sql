-- Ensure Realtime is enabled on messages table with full replica identity
-- This is needed for UPDATE events (like read_at changes) to include all columns
-- Run this in the Supabase SQL Editor: Dashboard > SQL Editor > New query

ALTER TABLE messages REPLICA IDENTITY FULL;
