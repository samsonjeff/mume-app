-- ==============================================================================
-- Migration: lock down permissive anon policies before public distribution
--
-- The 20261102 migration opened every table to anon/authenticated with
-- USING (true) for demo convenience. Combined with a client-side anon key,
-- that lets anyone on the internet read and write all application data,
-- including encrypted Page tokens and customer messages.
--
-- This migration restores an owner-scoped posture:
--   pages / conversations / messages / pending_actions: NO anon access.
--     Reads and writes go through the service_role backend (which bypasses
--     RLS) or authenticated users scoped to their own pages.user_id rows.
--   products: anon SELECT only (public store catalog). All writes go
--     through the service_role backend or authenticated owners.
-- ==============================================================================

-- 1. Drop every permissive policy from the demo migration
DROP POLICY IF EXISTS "Public and anon can read pages" ON public.pages;

DROP POLICY IF EXISTS "Public and anon can read conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public and anon can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public and anon can update conversations" ON public.conversations;

DROP POLICY IF EXISTS "Public and anon can read messages" ON public.messages;
DROP POLICY IF EXISTS "Public and anon can insert messages" ON public.messages;

DROP POLICY IF EXISTS "Public and anon can read pending_actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Public and anon can insert pending_actions" ON public.pending_actions;
DROP POLICY IF EXISTS "Public and anon can update pending_actions" ON public.pending_actions;

DROP POLICY IF EXISTS "Public and anon can read products" ON public.products;
DROP POLICY IF EXISTS "Public and anon can insert products" ON public.products;
DROP POLICY IF EXISTS "Public and anon can update products" ON public.products;
DROP POLICY IF EXISTS "Public and anon can delete products" ON public.products;

-- 2. Re-allow public catalog reads only. Writes stay restricted to the
-- service_role backend and authenticated owners (policies from the base
-- migration), so anonymous clients can never modify store data.
CREATE POLICY "Public can read products"
  ON public.products FOR SELECT TO anon, authenticated USING (true);
