-- ==============================================================================
-- Migration: 20261105000000_add_conversation_sessions.sql
-- Adds permanent AI session memory per conversation so replies have thread
-- reference when the customer messages again, and puts the new table on the
-- Supabase Realtime publication so clients auto-update on session changes.
-- Existing conversations/messages tables are already permanent + realtime
-- (see 20261031_create_mume_schema + 20261102_fix_realtime_and_rls).
-- ==============================================================================

-- 1. Session memory: one row per conversation, refreshed by the backend on
--    every assistant reply (POST /api/chat/messages) and every customer
--    message (POST /webhook worker).
create table if not exists public.conversation_sessions (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade unique,
    -- Rolling plain-language context for the AI (topics discussed, last intent)
    summary text not null default '',
    -- Short label of the latest customer topic, e.g. 'mango', 'apple', 'general'
    last_customer_topic text not null default 'general',
    last_activity_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_conversation_sessions_conversation on public.conversation_sessions(conversation_id);
create index if not exists idx_conversation_sessions_activity on public.conversation_sessions(last_activity_at desc);

-- 2. REPLICA IDENTITY FULL so Realtime CDC ships full row payloads
ALTER TABLE public.conversation_sessions REPLICA IDENTITY FULL;

-- 3. Add to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_sessions;
  END IF;
END $$;

-- 4. Row Level Security (locked-down posture, matching
--    20261104000000_lock_down_public_rls: NO anon access. Writes go through
--    the service_role backend, which bypasses RLS; authenticated users can
--    read only sessions belonging to their own pages.)
alter table public.conversation_sessions enable row level security;

create policy "Service role full access on conversation_sessions"
  on public.conversation_sessions for all using (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users read own conversation_sessions" ON public.conversation_sessions;
CREATE POLICY "Users read own conversation_sessions"
  ON public.conversation_sessions FOR SELECT TO authenticated USING (
    exists (
      select 1 from public.conversations
      join public.pages on pages.id = conversations.page_id
      where conversations.id = conversation_sessions.conversation_id
        and pages.user_id = auth.uid()
    )
  );
