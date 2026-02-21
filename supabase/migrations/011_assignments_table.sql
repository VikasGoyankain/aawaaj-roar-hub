-- Migration 011: Assignments table — region & university assignment tracking
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ─── 1. Create the assignments table ─────────────────────────────────────
-- Each row represents: "user X is assigned to work in region/university Y"
-- assignment_type = 'region' | 'university'

CREATE TABLE IF NOT EXISTS public.assignments (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('region', 'university')),
  -- Region fields (used when assignment_type = 'region')
  assigned_state    TEXT,
  assigned_district TEXT,
  -- University field (used when assignment_type = 'university')
  assigned_university TEXT,
  -- Meta
  assigned_by     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A user can only have one assignment per type at a time
  UNIQUE (user_id, assignment_type)
);

-- ─── 2. Index for fast lookups ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_user_id   ON public.assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_district  ON public.assignments (assigned_district) WHERE assigned_district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_university ON public.assignments (assigned_university) WHERE assigned_university IS NOT NULL;

-- ─── 3. Enable RLS ──────────────────────────────────────────────────────
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read assignments (needed for scoping in the UI)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'auth_users_read_assignments'
  ) THEN
    CREATE POLICY auth_users_read_assignments ON public.assignments
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Only admins should insert/update/delete via the service-role or through
-- the application logic. We allow authenticated users to manage rows where
-- they are the assigner.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assignments' AND policyname = 'auth_users_manage_assignments'
  ) THEN
    CREATE POLICY auth_users_manage_assignments ON public.assignments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── 4. Auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_assignments_updated_at();

-- ─── 5. Backfill assignments from existing data ─────────────────────────
-- For Regional Heads: create region assignment from their profile location
-- For University Presidents: create university assignment from their college
-- This is a one-time backfill and is idempotent.
INSERT INTO public.assignments (user_id, assignment_type, assigned_state, assigned_district, assigned_by)
SELECT
  ur.user_id,
  'region',
  p.state,
  p.residence_district,
  NULL
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.name = 'Regional Head'
JOIN profiles p ON p.id = ur.user_id
WHERE p.state IS NOT NULL OR p.residence_district IS NOT NULL
ON CONFLICT (user_id, assignment_type) DO NOTHING;

INSERT INTO public.assignments (user_id, assignment_type, assigned_university, assigned_by)
SELECT
  ur.user_id,
  'university',
  p.current_region_or_college,
  NULL
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.name = 'University President'
JOIN profiles p ON p.id = ur.user_id
WHERE p.current_region_or_college IS NOT NULL
ON CONFLICT (user_id, assignment_type) DO NOTHING;
