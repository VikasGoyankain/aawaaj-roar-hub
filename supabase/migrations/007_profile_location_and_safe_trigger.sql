-- ============================================================
-- 007 — Profile location columns + safe handle_new_user trigger
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─── 1. Add state & pincode columns to profiles ──────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS state   TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT;

-- ─── 2. Ensure submissions table exists ──────────────────────
-- If the submissions table was somehow dropped or never created,
-- create it so the trigger doesn't crash.
CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                submission_type NOT NULL,
  status              submission_status DEFAULT 'New',
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  region              TEXT,
  university          TEXT,
  skills              TEXT,
  motivation          TEXT,
  incident_date       DATE,
  incident_description TEXT,
  perpetrator_info    TEXT,
  urgency_level       TEXT,
  availability        TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  -- columns from migration 006
  pincode             TEXT,
  state               TEXT,
  district            TEXT,
  serve_role          TEXT,
  volunteer_scope     TEXT,
  serve_area_state    TEXT,
  serve_area_district TEXT,
  serve_area_pincode  TEXT,
  college             TEXT,
  about_self          TEXT,
  recommended_by      TEXT,
  dob                 DATE,
  consent             BOOLEAN DEFAULT false,
  converted_to_member BOOLEAN DEFAULT false
);

-- Enable RLS on submissions (idempotent)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (only if they don't already exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'anyone_can_insert_submissions'
  ) THEN
    CREATE POLICY anyone_can_insert_submissions ON submissions
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'admins_full_access_submissions'
  ) THEN
    CREATE POLICY admins_full_access_submissions ON submissions
      FOR ALL USING (is_super_admin());
  END IF;
END $$;

-- ─── 3. Replace handle_new_user() with safe version ──────────
-- Wraps the submissions lookup in a sub-block with EXCEPTION
-- handler so user creation NEVER fails, even if submissions
-- table is missing or has schema issues.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role_id   INT;
  _sub       RECORD;
  _role_name TEXT;
BEGIN
  -- Basic profile insert from auth metadata
  INSERT INTO public.profiles (
    id, full_name, email, mobile_no, gender, dob,
    residence_district, current_region_or_college, referred_by,
    state, pincode
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'mobile_no', ''),
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    NULLIF(NEW.raw_user_meta_data->>'dob', '')::DATE,
    NULLIF(NEW.raw_user_meta_data->>'residence_district', ''),
    NULLIF(NEW.raw_user_meta_data->>'current_region_or_college', ''),
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'referred_by', '') IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'referred_by')::UUID
      ELSE NULL
    END,
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
    NULLIF(NEW.raw_user_meta_data->>'pincode', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default Volunteer role (safe block)
  BEGIN
    SELECT id INTO _role_id
    FROM public.roles
    WHERE name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'Volunteer')
    LIMIT 1;

    IF _role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, _role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never fail user creation due to role issues
  END;

  -- Check if this email has an accepted submission (safe block)
  BEGIN
    SELECT *
    INTO _sub
    FROM submissions
    WHERE email = NEW.email
      AND converted_to_member = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Enrich the profile with submission data
      UPDATE public.profiles
      SET
        skills               = COALESCE(skills, _sub.skills),
        about_self           = COALESCE(about_self, _sub.about_self),
        recommended_by_name  = COALESCE(recommended_by_name, _sub.recommended_by),
        dob                  = COALESCE(dob, _sub.dob),
        current_region_or_college = COALESCE(current_region_or_college, _sub.college),
        residence_district   = COALESCE(residence_district, _sub.district),
        state                = COALESCE(state, _sub.state),
        pincode              = COALESCE(pincode, _sub.pincode)
      WHERE id = NEW.id;

      -- Map serve_role → roles table name
      _role_name := CASE _sub.serve_role
        WHEN 'regional_head'      THEN 'Regional Head'
        WHEN 'campus_coordinator' THEN 'University President'
        WHEN 'volunteer_sub'      THEN 'Volunteer'
        ELSE NULL
      END;

      IF _role_name IS NOT NULL THEN
        SELECT id INTO _role_id FROM roles WHERE name = _role_name LIMIT 1;
        IF _role_id IS NOT NULL THEN
          INSERT INTO user_roles (user_id, role_id)
          VALUES (NEW.id, _role_id)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- never fail user creation due to submissions issues
  END;

  RETURN NEW;
END;
$$;

-- ─── 4. Re-attach the trigger ────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Done ─────────────────────────────────────────────────────
-- This migration:
--   • Adds state & pincode columns to profiles for proper location storage
--   • Ensures submissions table exists (prevents trigger crash)
--   • Wraps submissions lookup in EXCEPTION block so user invite/signup
--     never fails even if submissions table has issues
