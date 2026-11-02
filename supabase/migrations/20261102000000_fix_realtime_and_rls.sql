-- ==============================================================================
-- Migration: 20261102000000_fix_realtime_and_rls.sql
-- Fixes:
-- 1. Sets REPLICA IDENTITY FULL on all core tables for Supabase Realtime
-- 2. Adds conversations to supabase_realtime publication
-- 3. Grants proper RLS policies for anon and authenticated clients so that
--    realtime subscriptions receive events and clients can read/insert messages
-- ==============================================================================

-- 1. Ensure REPLICA IDENTITY FULL for Supabase Realtime CDC
ALTER TABLE public.pages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.pending_actions REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. Add conversations to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pending_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_actions;
  END IF;
END $$;

-- 3. RLS Policies: Allow anon & authenticated users to read and insert
-- Pages: Allow reading pages
DROP POLICY IF EXISTS "Public and anon can read pages" ON public.pages;
CREATE POLICY "Public and anon can read pages" ON public.pages FOR SELECT TO anon, authenticated USING (true);

-- Conversations: Read and create conversations (e.g. AI assistant conversation or customer threads)
DROP POLICY IF EXISTS "Public and anon can read conversations" ON public.conversations;
CREATE POLICY "Public and anon can read conversations" ON public.conversations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public and anon can insert conversations" ON public.conversations;
CREATE POLICY "Public and anon can insert conversations" ON public.conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public and anon can update conversations" ON public.conversations;
CREATE POLICY "Public and anon can update conversations" ON public.conversations FOR UPDATE TO anon, authenticated USING (true);

-- Messages: Read and insert messages (for Realtime CDC and chat persistence)
DROP POLICY IF EXISTS "Public and anon can read messages" ON public.messages;
CREATE POLICY "Public and anon can read messages" ON public.messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public and anon can insert messages" ON public.messages;
CREATE POLICY "Public and anon can insert messages" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Pending Actions: Read, insert, and update pending approval actions
DROP POLICY IF EXISTS "Public and anon can read pending_actions" ON public.pending_actions;
CREATE POLICY "Public and anon can read pending_actions" ON public.pending_actions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public and anon can insert pending_actions" ON public.pending_actions;
CREATE POLICY "Public and anon can insert pending_actions" ON public.pending_actions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public and anon can update pending_actions" ON public.pending_actions;
CREATE POLICY "Public and anon can update pending_actions" ON public.pending_actions FOR UPDATE TO anon, authenticated USING (true);

-- Products: Full CRUD for store catalog
DROP POLICY IF EXISTS "Public and anon can read products" ON public.products;
CREATE POLICY "Public and anon can read products" ON public.products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public and anon can insert products" ON public.products;
CREATE POLICY "Public and anon can insert products" ON public.products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public and anon can update products" ON public.products;
CREATE POLICY "Public and anon can update products" ON public.products FOR UPDATE TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public and anon can delete products" ON public.products;
CREATE POLICY "Public and anon can delete products" ON public.products FOR DELETE TO anon, authenticated USING (true);
