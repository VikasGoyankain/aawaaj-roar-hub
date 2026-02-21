-- ============================================================
-- 011 — Public /our-team RPC functions
-- These SECURITY DEFINER functions bypass RLS and expose ONLY
-- the safe, public-facing fields needed for the /our-team page.
-- Callable by both anon (unauthenticated visitors) and
-- authenticated users (admin staff browsing the public site).
-- ============================================================

-- ─── 1. All member profiles + their primary role ─────────────
-- Primary role = the role with the lowest role_id (insertion order
-- in the roles table: President=1, Technical Head=2, ... Volunteer=6).
-- Also returns referred_by UUID so the client can compute referral counts.

DROP FUNCTION IF EXISTS get_public_team_members();

CREATE OR REPLACE FUNCTION get_public_team_members()
RETURNS TABLE (
  id                        UUID,
  full_name                 TEXT,
  profile_photo_url         TEXT,
  about_self                TEXT,
  state                     TEXT,
  current_region_or_college TEXT,
  residence_district        TEXT,
  joined_on                 TIMESTAMPTZ,
  skills                    TEXT,
  referred_by               UUID,
  role_name                 TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    p.id,
    p.full_name,
    p.profile_photo_url,
    p.about_self,
    p.state,
    p.current_region_or_college,
    p.residence_district,
    p.joined_on,
    p.skills,
    p.referred_by,
    (
      SELECT r.name
      FROM   user_roles ur
      JOIN   roles r ON r.id = ur.role_id
      WHERE  ur.user_id = p.id
      ORDER BY ur.role_id ASC   -- lowest role_id = highest-priority role
      LIMIT  1
    ) AS role_name
  FROM profiles p
  ORDER BY p.joined_on ASC;
$$;

GRANT EXECUTE ON FUNCTION get_public_team_members() TO anon, authenticated;

-- ─── 2. Career history for all members (public info) ─────────
DROP FUNCTION IF EXISTS get_public_career_history();

CREATE OR REPLACE FUNCTION get_public_career_history()
RETURNS TABLE (
  id               INT,
  user_id          UUID,
  role_name        TEXT,
  start_date       TIMESTAMPTZ,
  end_date         TIMESTAMPTZ,
  key_achievements TEXT,
  summary_of_work  TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, user_id, role_name, start_date, end_date, key_achievements, summary_of_work
  FROM   career_history
  ORDER BY start_date DESC;
$$;

GRANT EXECUTE ON FUNCTION get_public_career_history() TO anon, authenticated;

-- ─── 3. Published blogs for all authors (public info) ─────────
DROP FUNCTION IF EXISTS get_public_published_blogs();

CREATE OR REPLACE FUNCTION get_public_published_blogs()
RETURNS TABLE (
  id         UUID,
  author_id  UUID,
  title      TEXT,
  slug       TEXT,
  cover_image TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, author_id, title, slug, cover_image, created_at
  FROM   blogs
  WHERE  published = true
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_public_published_blogs() TO anon, authenticated;
