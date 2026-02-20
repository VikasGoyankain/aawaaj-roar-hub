-- ============================================================
-- 006 — Make Member Integration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─── 1. Add 'Accepted' to submission_status enum ─────────────
ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'Accepted';

-- ─── 2. Add new columns to submissions ───────────────────────
-- (idempotent — safe to run multiple times)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS pincode            TEXT,
  ADD COLUMN IF NOT EXISTS state              TEXT,
  ADD COLUMN IF NOT EXISTS district           TEXT,
  ADD COLUMN IF NOT EXISTS serve_role         TEXT,
  ADD COLUMN IF NOT EXISTS volunteer_scope    TEXT,
  ADD COLUMN IF NOT EXISTS serve_area_state   TEXT,
  ADD COLUMN IF NOT EXISTS serve_area_district TEXT,
  ADD COLUMN IF NOT EXISTS serve_area_pincode TEXT,
  ADD COLUMN IF NOT EXISTS college            TEXT,
  ADD COLUMN IF NOT EXISTS about_self         TEXT,
  ADD COLUMN IF NOT EXISTS recommended_by     TEXT,
  ADD COLUMN IF NOT EXISTS dob                DATE,
  ADD COLUMN IF NOT EXISTS consent            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS converted_to_member BOOLEAN DEFAULT false;

-- ─── 3. Add extra columns to profiles ────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skills              TEXT,
  ADD COLUMN IF NOT EXISTS about_self         TEXT,
  ADD COLUMN IF NOT EXISTS recommended_by_name TEXT;

-- ─── 4. Public RPC: get_member_names() ───────────────────────
-- Returns only full names — safe for the public "Recommended by" dropdown
-- on the registration form.

CREATE OR REPLACE FUNCTION get_member_names()
RETURNS TABLE(full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT p.full_name
  FROM profiles p
  ORDER BY p.full_name;
$$;

-- Allow anonymous (unauthenticated) callers to use this function
GRANT EXECUTE ON FUNCTION get_member_names() TO anon;

-- ─── 5. Auto-link: when an accepted applicant signs up ────────
-- When someone signs up using an email that matches an accepted
-- submission (converted_to_member = true), their profile is
-- auto-populated with skills, about_self, recommended_by_name,
-- dob, college, and their serve_role is mapped to a real role.

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
    residence_district, current_region_or_college, referred_by
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
    END
  );

  -- Check if this email has an accepted submission
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
      residence_district   = COALESCE(residence_district, _sub.district)
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

  RETURN NEW;
END;
$$;

-- ─── 6. Re-attach the trigger (in case it was replaced) ──────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Done ─────────────────────────────────────────────────────
-- After running this migration:
--   • "Make Member" button in admin panel sets status → Accepted
--   • When that person signs up with the same email, their profile
--     is auto-filled and their role is auto-assigned
--   • "Recommended by" dropdown on the register form now fetches
--     real member names via get_member_names() RPC
