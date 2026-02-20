-- ============================================================
-- Aawaaj Movement — V2 Full Schema Migration
-- Run this in Supabase SQL Editor AFTER dropping V1 tables,
-- or on a fresh project.
-- ============================================================

-- 0. Drop old objects if migrating from V1
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS get_user_region();
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS submission_type CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;

-- ============================================================
-- 1. Custom Enums
-- ============================================================
CREATE TYPE submission_type AS ENUM ('victim_report', 'volunteer_application');
CREATE TYPE submission_status AS ENUM ('New', 'In-Progress', 'Resolved');

-- ============================================================
-- 2. Roles Master Table
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
-- 3. Profiles Table (enhanced)
-- ============================================================
CREATE TABLE profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name               TEXT NOT NULL,
  email                   TEXT NOT NULL UNIQUE,
  mobile_no               TEXT,
  gender                  TEXT CHECK (gender IN ('Male','Female','Non-Binary','Prefer not to say')),
  dob                     DATE,
  residence_district      TEXT,
  current_region_or_college TEXT,
  profile_photo_url       TEXT,
  referred_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_on               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. User_Roles Bridge (many-to-many)
-- ============================================================
CREATE TABLE user_roles (
  id        SERIAL PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id   INT  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE (user_id, role_id)
);

-- ============================================================
-- 5. Career_History Table (Career Tree)
-- ============================================================
CREATE TABLE career_history (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_name         TEXT NOT NULL,
  start_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date          TIMESTAMPTZ,
  key_achievements  TEXT,
  summary_of_work   TEXT
);

-- ============================================================
-- 6. Blogs Table
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
-- 7. Submissions Table (unchanged from V1 logic)
-- ============================================================
CREATE TABLE submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  submission_type NOT NULL,
  status                submission_status NOT NULL DEFAULT 'New',
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  region                TEXT,
  -- victim fields
  incident_date         DATE,
  incident_description  TEXT,
  perpetrator_info      TEXT,
  urgency_level         TEXT CHECK (urgency_level IN ('low','medium','high','critical')),
  -- volunteer fields
  university            TEXT,
  skills                TEXT,
  motivation            TEXT,
  availability          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. Audit / History Logs
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
-- 9. Helper Functions
-- ============================================================

-- Check if current user holds a specific role name
CREATE OR REPLACE FUNCTION user_has_role(_role_name TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = _role_name
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's region (from profiles)
CREATE OR REPLACE FUNCTION get_user_region()
RETURNS TEXT AS $$
  SELECT residence_district FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Updated_at auto-touch
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_ts   BEFORE UPDATE ON profiles    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_ts BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blogs_ts      BEFORE UPDATE ON blogs       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 10. Auto-create profile + Volunteer role on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _volunteer_role_id INT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, mobile_no, residence_district, current_region_or_college, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'mobile_no',
    NEW.raw_user_meta_data->>'residence_district',
    NEW.raw_user_meta_data->>'current_region_or_college',
    CASE WHEN NEW.raw_user_meta_data->>'referred_by' IS NOT NULL
         THEN (NEW.raw_user_meta_data->>'referred_by')::UUID
         ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Auto-assign Volunteer role (or whatever was passed)
  SELECT id INTO _volunteer_role_id FROM roles WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'Volunteer');
  IF _volunteer_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id) VALUES (NEW.id, _volunteer_role_id) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 11. Auto career_history entry when roles change
-- ============================================================
-- When a new role is granted
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

-- When a role is revoked, close the career_history entry
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
-- 12. Row-Level Security
-- ============================================================
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;

-- ---- ROLES (read-only for everyone) ----
CREATE POLICY "Anyone can read roles" ON roles FOR SELECT TO authenticated USING (true);

-- ---- PROFILES ----
CREATE POLICY "President reads all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (user_has_role('President'));

CREATE POLICY "President inserts profiles"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_has_role('President'));

CREATE POLICY "President updates all profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (user_has_role('President'))
  WITH CHECK (user_has_role('President'));

CREATE POLICY "President deletes profiles"
  ON profiles FOR DELETE TO authenticated
  USING (user_has_role('President'));

CREATE POLICY "Tech/Content Head reads all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (user_has_role('Technical Head') OR user_has_role('Content Head'));

CREATE POLICY "Regional Head reads regional profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    user_has_role('Regional Head')
    AND residence_district = get_user_region()
  );

CREATE POLICY "University President reads regional profiles"
  ON profiles FOR SELECT TO authenticated
  USING (
    user_has_role('University President')
    AND residence_district = get_user_region()
  );

CREATE POLICY "Own profile read"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Own profile update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---- USER_ROLES ----
CREATE POLICY "President manages user_roles"
  ON user_roles FOR ALL TO authenticated
  USING (user_has_role('President'))
  WITH CHECK (user_has_role('President'));

CREATE POLICY "Read own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Heads read all user_roles"
  ON user_roles FOR SELECT TO authenticated
  USING (user_has_role('Technical Head') OR user_has_role('Content Head') OR user_has_role('Regional Head'));

-- ---- CAREER_HISTORY ----
CREATE POLICY "President reads all career history"
  ON career_history FOR SELECT TO authenticated
  USING (user_has_role('President'));

CREATE POLICY "Heads read all career history"
  ON career_history FOR SELECT TO authenticated
  USING (user_has_role('Technical Head') OR user_has_role('Content Head'));

CREATE POLICY "Own career history"
  ON career_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "President manages career history"
  ON career_history FOR ALL TO authenticated
  USING (user_has_role('President'))
  WITH CHECK (user_has_role('President'));

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

CREATE POLICY "Content Head manages all blogs"
  ON blogs FOR ALL TO authenticated
  USING (user_has_role('Content Head') OR user_has_role('President'))
  WITH CHECK (user_has_role('Content Head') OR user_has_role('President'));

-- ---- SUBMISSIONS ----
CREATE POLICY "President full access submissions"
  ON submissions FOR ALL TO authenticated
  USING (user_has_role('President'))
  WITH CHECK (user_has_role('President'));

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
CREATE POLICY "President reads all audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_has_role('President'));

CREATE POLICY "Head reads own audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Authenticated inserts audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- ============================================================
-- 13. Indexes
-- ============================================================
CREATE INDEX idx_profiles_district      ON profiles(residence_district);
CREATE INDEX idx_profiles_referred_by   ON profiles(referred_by);
CREATE INDEX idx_user_roles_user        ON user_roles(user_id);
CREATE INDEX idx_user_roles_role        ON user_roles(role_id);
CREATE INDEX idx_career_user            ON career_history(user_id);
CREATE INDEX idx_blogs_author           ON blogs(author_id);
CREATE INDEX idx_blogs_published        ON blogs(published);
CREATE INDEX idx_submissions_type       ON submissions(type);
CREATE INDEX idx_submissions_status     ON submissions(status);
CREATE INDEX idx_submissions_region     ON submissions(region);
CREATE INDEX idx_submissions_created    ON submissions(created_at DESC);
CREATE INDEX idx_audit_admin            ON audit_logs(admin_id);
CREATE INDEX idx_audit_created          ON audit_logs(created_at DESC);

-- ============================================================
-- 14. Seed President
-- After running this migration:
-- 1. Go to Supabase Auth → Add User → create president@aawaaj.org
-- 2. Copy their UUID
-- 3. Run:
-- INSERT INTO profiles (id, full_name, email) VALUES ('UUID','President Name','president@aawaaj.org');
-- INSERT INTO user_roles (user_id, role_id) VALUES ('UUID', (SELECT id FROM roles WHERE name='President'));
-- ============================================================
