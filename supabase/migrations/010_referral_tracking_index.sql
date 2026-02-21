-- Migration 010: Referral Tracking — index, FK, and backfill
-- Run this in the Supabase SQL Editor

-- ─── 1. Add index on profiles.referred_by for fast referral count queries ───
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by
  ON public.profiles (referred_by)
  WHERE referred_by IS NOT NULL;

-- ─── 2. Add FK constraint so referred_by can only point to real profiles ────
-- Uses ON DELETE SET NULL so deleting a referrer doesn't cascade-delete members.
-- Run only if the constraint doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_referred_by_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_referred_by_fkey
      FOREIGN KEY (referred_by)
      REFERENCES public.profiles (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 3. Backfill referred_by for existing members from their submissions ─────
-- For any profile that has recommended_by_name set but referred_by is NULL,
-- try to resolve the referrer UUID by matching full_name (case-insensitive).
-- Only safe matches (exactly one result per name) are applied.
WITH resolved AS (
  SELECT
    p.id                                       AS member_id,
    (
      SELECT r.id
      FROM public.profiles r
      WHERE LOWER(r.full_name) = LOWER(p.recommended_by_name)
        AND r.id <> p.id
      LIMIT 1
    )                                          AS referrer_id
  FROM public.profiles p
  WHERE p.referred_by IS NULL
    AND p.recommended_by_name IS NOT NULL
)
UPDATE public.profiles AS p
SET referred_by = resolved.referrer_id
FROM resolved
WHERE p.id = resolved.member_id
  AND resolved.referrer_id IS NOT NULL;
