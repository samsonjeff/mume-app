-- ==============================================================================
-- Migration: 20261106000000_auto_expire_real_data.sql
-- Real API data older than 10 minutes auto-deletes by the system.
--
-- Scope (real data only — rows that came from the Meta Graph API / webhook):
--   public.messages (created_at)
--   public.pending_actions (created_at)
--   public.conversation_sessions (last_activity_at)
--   public.conversations (last_message_at)
--
-- Explicitly NOT touched:
--   public.pages / public.users / public.products (persistent catalog +
--   credentials — never expire), and dummy / sample content which lives only
--   in the frontend bundle (INITIAL_PRODUCTS, DUMMY_CONVOS, welcome message)
--   and is never written to these tables, so the function can never delete it.
-- ==============================================================================

-- 1. Indexes so the 10-minute expiry scans stay cheap
create index if not exists idx_messages_created_at_ttl
  on public.messages(created_at);
create index if not exists idx_pending_actions_created_at_ttl
  on public.pending_actions(created_at);
create index if not exists idx_conversation_sessions_activity_ttl
  on public.conversation_sessions(last_activity_at);
create index if not exists idx_conversations_last_message_ttl
  on public.conversations(last_message_at);

-- 2. Expiry function: deletes real rows older than 10 minutes.
-- Returns per-table delete counts for observability.
create or replace function public.expire_real_data_older_than_10_minutes()
returns table (deleted_messages int, deleted_pending_actions int, deleted_sessions int, deleted_conversations int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - interval '10 minutes';
  v_messages int := 0;
  v_pending int := 0;
  v_sessions int := 0;
  v_convs int := 0;
begin
  -- Child rows first so parents can be removed cleanly (FK cascades
  -- would also handle this, but explicit order is deterministic).
  delete from public.messages where created_at < v_cutoff;
  get diagnostics v_messages = row_count;

  delete from public.pending_actions where created_at < v_cutoff;
  get diagnostics v_pending = row_count;

  delete from public.conversation_sessions where last_activity_at < v_cutoff;
  get diagnostics v_sessions = row_count;

  -- Conversations last: cascade removes any leftover child rows.
  -- Every row here is real (dummy convos are frontend-only, never inserted).
  delete from public.conversations where last_message_at < v_cutoff;
  get diagnostics v_convs = row_count;

  -- NOTE: pages, users, products are intentionally never deleted here.
  deleted_messages := v_messages;
  deleted_pending_actions := v_pending;
  deleted_sessions := v_sessions;
  deleted_conversations := v_convs;
  return next;
end;
$$;

-- 3. Best-effort pg_cron schedule (only when the extension is available,
-- e.g. self-hosted Postgres). On hosted Supabase without pg_cron, the
-- backend sweeper (backend/src/index.js, 60s interval) + per-request prune
-- perform the same system auto-delete, so this schedule is optional.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Re-runnable: only schedule when the job does not exist yet.
    if not exists (select 1 from cron.job where jobname = 'mume-expire-real-data-10min') then
      perform cron.schedule(
        'mume-expire-real-data-10min',
        '* * * * *',
        'select public.expire_real_data_older_than_10_minutes()'
      );
    end if;
  end if;
exception
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $do$;
