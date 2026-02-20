-- ============================================================
-- FIX: Create missing roles + user_roles tables and
--      update handle_new_user trigger to match V2 schema.
-- Run this in Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

-- 1. Create roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.roles (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 2. Seed role names (safe — ON CONFLICT DO NOTHING)
INSERT INTO public.roles (name) VALUES
  ('President'),
  ('Technical Head'),
  ('Content Head'),
  ('Regional Head'),
  ('University President'),
  ('Volunteer')
ON CONFLICT (name) DO NOTHING;

-- 3. Create user_roles bridge table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    INT  NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS on both tables if not already enabled
ALTER TABLE public.roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Ensure read policies exist (idempotent via DROP IF EXISTS first)
DROP POLICY IF EXISTS "Anyone can read roles" ON public.roles;
CREATE POLICY "Anyone can read roles"
  ON public.roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "President manages user_roles" ON public.user_roles;
CREATE POLICY "President manages user_roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur2
      JOIN public.roles r ON r.id = ur2.role_id
      WHERE ur2.user_id = auth.uid() AND r.name = 'President'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur2
      JOIN public.roles r ON r.id = ur2.role_id
      WHERE ur2.user_id = auth.uid() AND r.name = 'President'
    )
  );

DROP POLICY IF EXISTS "Read own roles" ON public.user_roles;
CREATE POLICY "Read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. Replace handle_new_user with a safe version
--    - Includes gender + dob from metadata
--    - Roles lookup wrapped in exception handler so user creation
--      never fails even if roles table is somehow unavailable
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role_id INT;
BEGIN
  -- Insert profile row (ignore if already exists)
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    mobile_no,
    gender,
    dob,
    residence_district,
    current_region_or_college,
    referred_by
  )
  VALUES (
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

  -- Auto-assign Volunteer role (silently skip if roles table is missing)
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
  EXCEPTION WHEN undefined_table THEN
    -- roles table missing — skip role assignment, profile still created
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
