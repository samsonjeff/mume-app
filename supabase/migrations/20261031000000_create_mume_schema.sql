-- ==============================================================================
-- Mume Schema Migration: 20261031000000_create_mume_schema.sql
-- Database: Supabase Postgres + pgvector + Realtime
-- ==============================================================================

-- 1. Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. Users Table
-- Ties Supabase Auth / app users to their Facebook User ID
create table if not exists public.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    fb_user_id text unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Pages Table
-- Stores linked Facebook Pages with AES-256-GCM encrypted Page Access Tokens
create table if not exists public.pages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade,
    fb_page_id text not null unique,
    page_name text not null,
    page_access_token_encrypted text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_pages_fb_page_id on public.pages(fb_page_id);
create index if not exists idx_pages_user_id on public.pages(user_id);

-- 4. Products Table (Catalog + Semantic Search via pgvector)
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    page_id uuid not null references public.pages(id) on delete cascade,
    name text not null,
    price numeric(12, 2) not null,
    unit text not null default 'piece', -- e.g. 'kg', 'piece', 'bundle'
    image_url text,
    embedding vector(1536), -- Vector for semantic search (Tagalog / English matching)
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_products_page_id on public.products(page_id);

-- 5. Conversations Table
-- Represents Messenger customer threads linked to a Page
create table if not exists public.conversations (
    id uuid primary key default gen_random_uuid(),
    page_id uuid not null references public.pages(id) on delete cascade,
    customer_psid text not null, -- Page-Scoped User ID
    customer_name text,
    last_message_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    unique(page_id, customer_psid)
);

create index if not exists idx_conversations_page_psid on public.conversations(page_id, customer_psid);
create index if not exists idx_conversations_last_msg on public.conversations(last_message_at desc);

-- 6. Messages Table
-- Chat history for each conversation
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    fb_message_id text unique,
    sender text not null, -- 'customer' or 'page' or 'assistant'
    text text not null,
    is_from_customer boolean not null default true,
    created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at asc);

-- 7. Pending Actions Table (Human-in-the-loop price confirmation gate)
create table if not exists public.pending_actions (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    product_id uuid references public.products(id) on delete set null,
    draft_reply text not null,
    suggested_price numeric(12, 2),
    status text not null default 'waiting_approval', -- 'waiting_approval' | 'approved' | 'rejected' | 'sent'
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_pending_actions_conversation on public.pending_actions(conversation_id);
create index if not exists idx_pending_actions_status on public.pending_actions(status);

-- 8. Enable Realtime Publications
-- Enables phone app to listen to new messages and pending approvals instantly
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pending_actions'
  ) then
    alter publication supabase_realtime add table public.pending_actions;
  end if;
end $$;

-- 9. Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.pages enable row level security;
alter table public.products enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.pending_actions enable row level security;

-- Policies: Service role (backend) has full access to all tables
create policy "Service role full access on users" on public.users for all using (auth.role() = 'service_role');
create policy "Service role full access on pages" on public.pages for all using (auth.role() = 'service_role');
create policy "Service role full access on products" on public.products for all using (auth.role() = 'service_role');
create policy "Service role full access on conversations" on public.conversations for all using (auth.role() = 'service_role');
create policy "Service role full access on messages" on public.messages for all using (auth.role() = 'service_role');
create policy "Service role full access on pending_actions" on public.pending_actions for all using (auth.role() = 'service_role');

-- Authenticated users (mobile app) can read their own resources
create policy "Users read own profile" on public.users for select using (auth.uid() = id);
create policy "Users read own pages" on public.pages for select using (auth.uid() = user_id);
create policy "Users read own products" on public.products for select using (
  exists (select 1 from public.pages where pages.id = products.page_id and pages.user_id = auth.uid())
);
create policy "Users read own conversations" on public.conversations for select using (
  exists (select 1 from public.pages where pages.id = conversations.page_id and pages.user_id = auth.uid())
);
create policy "Users read own messages" on public.messages for select using (
  exists (
    select 1 from public.conversations
    join public.pages on pages.id = conversations.page_id
    where conversations.id = messages.conversation_id and pages.user_id = auth.uid()
  )
);
create policy "Users update own pending_actions" on public.pending_actions for all using (
  exists (
    select 1 from public.conversations
    join public.pages on pages.id = conversations.page_id
    where conversations.id = pending_actions.conversation_id and pages.user_id = auth.uid()
  )
);
