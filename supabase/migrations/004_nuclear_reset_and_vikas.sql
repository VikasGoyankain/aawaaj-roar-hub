-- ============================================================
-- AAWAAJ MOVEMENT — NUCLEAR RESET + V2 FRESH SCHEMA
-- Technical Head gets FULL President-level permissions.
-- Vikas Goyanka is seeded as Technical Head.
--
-- HOW TO RUN:
--   1. Supabase Dashboard → Authentication → Users → Delete ALL users manually
--   2. Supabase Dashboard → SQL Editor → New Query → paste and run this file
-- ============================================================

-- ============================================================
-- STEP 0: WIPE EVERYTHING (tables, triggers, functions, types)
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS trg_role_granted       ON user_roles;
DROP TRIGGER IF EXISTS trg_role_revoked       ON user_roles;
DROP TRIGGER IF EXISTS update_profiles_ts     ON profiles;
DROP TRIGGER IF EXISTS update_submissions_ts  ON submissions;
DROP TRIGGER IF EXISTS update_blogs_ts        ON blogs;
DROP TRIGGER IF EXISTS update_profiles_updated_at   ON profiles;
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;

DROP FUNCTION IF EXISTS handle_new_user()              CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column()     CASCADE;
DROP FUNCTION IF EXISTS user_has_role(TEXT)            CASCADE;
DROP FUNCTION IF EXISTS get_user_region()              CASCADE;
DROP FUNCTION IF EXISTS get_user_role()                CASCADE;
DROP FUNCTION IF EXISTS on_role_granted()              CASCADE;
DROP FUNCTION IF EXISTS on_role_revoked()              CASCADE;

DROP TABLE IF EXISTS audit_logs     CASCADE;
DROP TABLE IF EXISTS blogs          CASCADE;
DROP TABLE IF EXISTS submissions    CASCADE;
DROP TABLE IF EXISTS career_history CASCADE;
DROP TABLE IF EXISTS user_roles     CASCADE;
DROP TABLE IF EXISTS profiles       CASCADE;
DROP TABLE IF EXISTS roles          CASCADE;

DROP TYPE IF EXISTS submission_type   CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS user_role         CASCADE;

-- ============================================================
-- STEP 1: Enums
-- ============================================================
CREATE TYPE submission_type   AS ENUM ('victim_report', 'volunteer_application');
CREATE TYPE submission_status AS ENUM ('New', 'In-Progress', 'Resolved');

-- ============================================================
-- STEP 2: Roles master table
-- ============================================================
CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO roles (name) VALUES
  ('President'),
  ('Technical Head'),
  ('Content Head'),
  ('Regional Head'),
  ('University President'),
  ('Volunteer');

-- ============================================================
-- STEP 3: Profiles
-- ============================================================
CREATE TABLE profiles (
  id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                 TEXT NOT NULL,
  email                     TEXT NOT NULL UNIQUE,
  mobile_no                 TEXT,
  gender                    TEXT CHECK (gender IN ('Male','Female','Non-Binary','Prefer not to say')),
  dob                       DATE,
  residence_district        TEXT,
  current_region_or_college TEXT,
  profile_photo_url         TEXT,
  referred_by               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_on                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 4: User_Roles bridge
-- ============================================================
CREATE TABLE user_roles (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  role_id    INT  NOT NULL REFERENCES roles(id)     ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id)           ON DELETE SET NULL,
  UNIQUE (user_id, role_id)
);

-- ============================================================
-- STEP 5: Career History
-- ============================================================
CREATE TABLE career_history (
  id               SERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_name        TEXT NOT NULL,
  start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date         TIMESTAMPTZ,
  key_achievements TEXT,
  summary_of_work  TEXT
);

-- ============================================================
-- STEP 6: Blogs
-- ============================================================
CREATE TABLE blogs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  content     TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  published   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 7: Submissions
-- ============================================================
CREATE TABLE submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                 submission_type   NOT NULL,
  status               submission_status NOT NULL DEFAULT 'New',
  full_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT,
  region               TEXT,
  incident_date        DATE,
  incident_description TEXT,
  perpetrator_info     TEXT,
  urgency_level        TEXT CHECK (urgency_level IN ('low','medium','high','critical')),
  university           TEXT,
  skills               TEXT,
  motivation           TEXT,
  availability         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 8: Audit Logs
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 9: Helper Functions
-- ============================================================

-- Is the calling user a super-admin? (President OR Technical Head)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('President', 'Technical Head')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Generic role check
CREATE OR REPLACE FUNCTION user_has_role(_role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = _role_name
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Current user's region
CREATE OR REPLACE FUNCTION get_user_region()
RETURNS TEXT AS $$
  SELECT residence_district FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_ts    BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_ts BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blogs_ts       BEFORE UPDATE ON blogs       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- STEP 10: Auto-create profile on auth.users INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role_id INT;
BEGIN
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
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign role (default Volunteer)
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STEP 11: Career history auto-tracking
-- ============================================================
CREATE OR REPLACE FUNCTION on_role_granted()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO career_history (user_id, role_name, start_date)
  VALUES (NEW.user_id, (SELECT name FROM roles WHERE id = NEW.role_id), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_role_granted
  AFTER INSERT ON user_roles
  FOR EACH ROW EXECUTE FUNCTION on_role_granted();

CREATE OR REPLACE FUNCTION on_role_revoked()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE career_history
  SET end_date = NOW()
  WHERE user_id = OLD.user_id
    AND role_name = (SELECT name FROM roles WHERE id = OLD.role_id)
    AND end_date IS NULL;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_role_revoked
  AFTER DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION on_role_revoked();

-- ============================================================
-- STEP 12: Row Level Security
--   Technical Head has IDENTICAL permissions to President.
-- ============================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;

-- ---- ROLES (read-only for everyone) ----
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT TO authenticated USING (true);

-- ---- PROFILES ----
CREATE POLICY "Super-admin reads all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super-admin inserts profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super-admin updates all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super-admin deletes profiles"
  ON profiles FOR DELETE TO authenticated
  USING (is_super_admin());

CREATE POLICY "Content Head reads all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (user_has_role('Content Head'));

CREATE POLICY "Regional Head reads regional profiles"
  ON profiles FOR SELECT TO authenticated
  USING (user_has_role('Regional Head') AND residence_district = get_user_region());

CREATE POLICY "University President reads regional profiles"
  ON profiles FOR SELECT TO authenticated
  USING (user_has_role('University President') AND residence_district = get_user_region());

CREATE POLICY "Own profile read"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Own profile update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- USER_ROLES ----
CREATE POLICY "Super-admin manages user_roles"
  ON user_roles FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Read own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Heads read all user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_has_role('Content Head') OR user_has_role('Regional Head'));

-- ---- CAREER_HISTORY ----
CREATE POLICY "Super-admin manages career history"
  ON career_history FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Content Head reads all career history"
  ON career_history FOR SELECT TO authenticated
  USING (user_has_role('Content Head'));

CREATE POLICY "Own career history"
  ON career_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---- BLOGS ----
CREATE POLICY "Anyone reads published blogs"
  ON blogs FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "Authors read own blogs"
  ON blogs FOR SELECT TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Authors manage own blogs"
  ON blogs FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors update own blogs"
  ON blogs FOR UPDATE TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Super-admin and Content Head manage all blogs"
  ON blogs FOR ALL TO authenticated
  USING (is_super_admin() OR user_has_role('Content Head'))
  WITH CHECK (is_super_admin() OR user_has_role('Content Head'));

-- ---- SUBMISSIONS ----
CREATE POLICY "Super-admin full access submissions"
  ON submissions FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Regional Head reads regional submissions"
  ON submissions FOR SELECT TO authenticated
  USING (user_has_role('Regional Head') AND region = get_user_region());

CREATE POLICY "Regional Head updates regional submissions"
  ON submissions FOR UPDATE TO authenticated
  USING (user_has_role('Regional Head') AND region = get_user_region())
  WITH CHECK (user_has_role('Regional Head') AND region = get_user_region());

CREATE POLICY "University President reads regional submissions"
  ON submissions FOR SELECT TO authenticated
  USING (user_has_role('University President') AND region = get_user_region());

CREATE POLICY "Public can insert submissions"
  ON submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- ---- AUDIT_LOGS ----
CREATE POLICY "Super-admin reads all audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Head reads own audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Authenticated inserts audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- ============================================================
-- STEP 13: Indexes
-- ============================================================
CREATE INDEX idx_profiles_district    ON profiles(residence_district);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX idx_user_roles_user      ON user_roles(user_id);
CREATE INDEX idx_user_roles_role      ON user_roles(role_id);
CREATE INDEX idx_career_user          ON career_history(user_id);
CREATE INDEX idx_blogs_author         ON blogs(author_id);
CREATE INDEX idx_blogs_published      ON blogs(published);
CREATE INDEX idx_submissions_type     ON submissions(type);
CREATE INDEX idx_submissions_status   ON submissions(status);
CREATE INDEX idx_submissions_region   ON submissions(region);
CREATE INDEX idx_submissions_created  ON submissions(created_at DESC);
CREATE INDEX idx_audit_admin          ON audit_logs(admin_id);
CREATE INDEX idx_audit_created        ON audit_logs(created_at DESC);

-- ============================================================
-- STEP 14: Seed Vikas Goyanka as Technical Head
--
-- After running this SQL:
--   1. Go to Supabase Dashboard → Authentication → Users → Add User
--   2. Email: vikasgoyanka@aawaajmovement.org  (or whatever email Vikas uses)
--   3. Set a temporary password, tick "Auto-confirm user"
--   4. The trigger will auto-create the profile.
--   5. Then run the TWO LINES below (replace UUID with the actual UUID from Auth):
--
-- INSERT INTO user_roles (user_id, role_id)
-- VALUES ('<VIKAS_UUID>', (SELECT id FROM roles WHERE name = 'Technical Head'));
--
-- Or use the admin panel Settings page to assign the role after login.
-- ============================================================
