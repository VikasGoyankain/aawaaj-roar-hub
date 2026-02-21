-- ============================================================
-- 012 — Add AISHE university fields to submissions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS aishe_code       TEXT,
  ADD COLUMN IF NOT EXISTS college_state    TEXT,
  ADD COLUMN IF NOT EXISTS college_district TEXT;

-- Optional: index for filtering submissions by university details
CREATE INDEX IF NOT EXISTS idx_submissions_aishe_code
  ON submissions (aishe_code)
  WHERE aishe_code IS NOT NULL;
