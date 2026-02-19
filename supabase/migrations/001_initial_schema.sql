-- ============================================================
-- Aawaaj Movement Admin Dashboard - Supabase Schema Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Create custom types
CREATE TYPE user_role AS ENUM (
  'President',
  'Regional Head',
  'University President',
  'Volunteer'
);

CREATE TYPE submission_type AS ENUM (
  'victim_report',
  'volunteer_application'
);

CREATE TYPE submission_status AS ENUM (
  'New',
  'In-Progress',
  'Resolved'
);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'Volunteer',
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Submissions Table (Victim reports + Volunteer applications)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type submission_type NOT NULL,
  status submission_status NOT NULL DEFAULT 'New',
  -- Common fields
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  region TEXT,
  -- Victim report specific fields
  incident_date DATE,
  incident_description TEXT,
  perpetrator_info TEXT,
  urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  -- Volunteer application specific fields
  university TEXT,
  skills TEXT,
  motivation TEXT,
  availability TEXT,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT, -- 'profile', 'submission', etc.
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Auto-create profile on new auth user signup (for magic link invites)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, region)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Volunteer'),
    NEW.raw_user_meta_data->>'region'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. Row-Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get the current user's region
CREATE OR REPLACE FUNCTION get_user_region()
RETURNS TEXT AS $$
  SELECT region FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES POLICIES ----

-- President can read all profiles
CREATE POLICY "President can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'President');

-- President can insert profiles
CREATE POLICY "President can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'President');

-- President can update all profiles
CREATE POLICY "President can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'President')
  WITH CHECK (get_user_role() = 'President');

-- President can delete profiles
CREATE POLICY "President can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (get_user_role() = 'President');

-- Regional Head can read profiles in their region
CREATE POLICY "Regional Head can read regional profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'Regional Head'
    AND region = get_user_region()
  );

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile (name only, not role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- ---- SUBMISSIONS POLICIES ----

-- President can do everything with submissions
CREATE POLICY "President full access on submissions"
  ON submissions FOR ALL
  TO authenticated
  USING (get_user_role() = 'President')
  WITH CHECK (get_user_role() = 'President');

-- Regional Head can read/write submissions in their region
CREATE POLICY "Regional Head can read regional submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'Regional Head'
    AND region = get_user_region()
  );

CREATE POLICY "Regional Head can update regional submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'Regional Head'
    AND region = get_user_region()
  )
  WITH CHECK (
    get_user_role() = 'Regional Head'
    AND region = get_user_region()
  );

-- University President can read submissions from their region
CREATE POLICY "University President can read regional submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'University President'
    AND region = get_user_region()
  );

-- Allow anonymous submission inserts (for the public intake form)
CREATE POLICY "Anyone can submit"
  ON submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ---- AUDIT LOGS POLICIES ----

-- President can read all audit logs
CREATE POLICY "President can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (get_user_role() = 'President');

-- Regional Head can read audit logs for their actions
CREATE POLICY "Regional Head can read own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'Regional Head'
    AND admin_id = auth.uid()
  );

-- All authenticated users can insert audit logs (logged server-side)
CREATE POLICY "Authenticated can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (admin_id = auth.uid());

-- ============================================================
-- 7. Indexes for performance
-- ============================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_region ON profiles(region);
CREATE INDEX idx_submissions_type ON submissions(type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_region ON submissions(region);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- 8. Seed: Create initial President account
-- After running this, sign up a user in Supabase Auth,
-- then update the id below with the Auth user's UUID.
-- ============================================================
-- INSERT INTO profiles (id, full_name, email, role, region)
-- VALUES (
--   'YOUR-AUTH-USER-UUID',
--   'Admin President',
--   'president@aawaaj.org',
--   'President',
--   NULL
-- );
