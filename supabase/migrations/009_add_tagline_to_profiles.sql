-- Migration 009: Add tagline column to profiles
-- Run this in the Supabase SQL editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMENT ON COLUMN public.profiles.tagline IS 'A short personal tagline shown on the member''s profile (max 120 chars).';
