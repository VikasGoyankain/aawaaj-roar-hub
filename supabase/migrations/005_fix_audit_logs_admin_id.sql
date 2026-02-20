-- ============================================================
-- FIX: audit_logs.admin_id NOT NULL conflicts with ON DELETE SET NULL
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Drop the NOT NULL constraint so deleted users don't break audit history
ALTER TABLE public.audit_logs
  ALTER COLUMN admin_id DROP NOT NULL;
