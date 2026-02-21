-- ============================================================
-- 013 – Fix submissions RLS so Regional Heads / University
--       Presidents can read & update submissions for their
--       assigned area (serve_area_district, college, etc.)
--
--  Previous policies compared submission.region (which stores
--  "District, State") against get_user_region() (which returns
--  just "District").  They also never checked serve_area_district,
--  college or university columns.
-- ============================================================

-- ── 1. Drop the broken policies ─────────────────────────────

DROP POLICY IF EXISTS "Regional Head reads regional submissions"   ON submissions;
DROP POLICY IF EXISTS "Regional Head updates regional submissions" ON submissions;
DROP POLICY IF EXISTS "University President reads regional submissions" ON submissions;

-- Keep: "Super-admin full access submissions" / "admins_full_access_submissions"
-- Keep: "Public can insert submissions" / "anyone_can_insert_submissions"

-- ── 2. Helper: get user's assigned district (falls back to profile) ──

CREATE OR REPLACE FUNCTION get_user_assigned_district()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT assigned_district FROM assignments
     WHERE user_id = auth.uid() AND assignment_type = 'region' LIMIT 1),
    (SELECT residence_district FROM profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_assigned_university()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT assigned_university FROM assignments
     WHERE user_id = auth.uid() AND assignment_type = 'university' LIMIT 1),
    (SELECT current_region_or_college FROM profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── 3. New READ policies ────────────────────────────────────

-- Regional Head can see submissions where serve-area or residence
-- district matches their assigned district  (case-insensitive).
CREATE POLICY "Regional Head reads scoped submissions"
  ON submissions FOR SELECT TO authenticated
  USING (
    user_has_role('Regional Head')
    AND (
         LOWER(serve_area_district) = LOWER(get_user_assigned_district())
      OR LOWER(district)            = LOWER(get_user_assigned_district())
      OR region ILIKE '%' || get_user_assigned_district() || '%'
    )
  );

-- University President can see submissions whose college / university
-- matches their assignment (case-insensitive substring).
CREATE POLICY "University President reads scoped submissions"
  ON submissions FOR SELECT TO authenticated
  USING (
    user_has_role('University President')
    AND (
         college    ILIKE '%' || get_user_assigned_university() || '%'
      OR university ILIKE '%' || get_user_assigned_university() || '%'
    )
  );

-- ── 4. New UPDATE policies (same predicates) ───────────────

CREATE POLICY "Regional Head updates scoped submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (
    user_has_role('Regional Head')
    AND (
         LOWER(serve_area_district) = LOWER(get_user_assigned_district())
      OR LOWER(district)            = LOWER(get_user_assigned_district())
      OR region ILIKE '%' || get_user_assigned_district() || '%'
    )
  )
  WITH CHECK (
    user_has_role('Regional Head')
    AND (
         LOWER(serve_area_district) = LOWER(get_user_assigned_district())
      OR LOWER(district)            = LOWER(get_user_assigned_district())
      OR region ILIKE '%' || get_user_assigned_district() || '%'
    )
  );

CREATE POLICY "University President updates scoped submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (
    user_has_role('University President')
    AND (
         college    ILIKE '%' || get_user_assigned_university() || '%'
      OR university ILIKE '%' || get_user_assigned_university() || '%'
    )
  )
  WITH CHECK (
    user_has_role('University President')
    AND (
         college    ILIKE '%' || get_user_assigned_university() || '%'
      OR university ILIKE '%' || get_user_assigned_university() || '%'
    )
  );

-- ── 5. Content Head can read all submissions ────────────────

CREATE POLICY "Content Head reads all submissions"
  ON submissions FOR SELECT TO authenticated
  USING (user_has_role('Content Head'));
