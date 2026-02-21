-- ============================================================
-- 008 — Footer Settings table
-- Stores dynamic footer content (social links, contacts, quick links)
-- Accessible only by President and Technical Head via the admin panel.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ─── 1. Create the footer_settings singleton table ───────────
CREATE TABLE IF NOT EXISTS footer_settings (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),   -- enforces a single row
  social_links        JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_leadership  JSONB NOT NULL DEFAULT '[]'::jsonb,
  quick_links         JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  updated_by          UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ─── 2. Seed default values matching the hard-coded footer ───
INSERT INTO footer_settings (id, social_links, contact_leadership, quick_links)
VALUES (
  1,
  '[
    {"platform": "Instagram", "url": "https://instagram.com/aawaaj_movement", "icon": "instagram"},
    {"platform": "LinkedIn",  "url": "https://linkedin.com",                  "icon": "linkedin"},
    {"platform": "Twitter",   "url": "https://twitter.com",                   "icon": "twitter"}
  ]'::jsonb,
  '[
    {"name": "Hardik Gajraj",      "title": "Founder & National Head",           "email": "hardik@aawaaj.org"},
    {"name": "Kushal Manish Jain", "title": "Co-Founder & Operations Head",      "email": "kushal@aawaaj.org"}
  ]'::jsonb,
  '[
    {"label": "About the Movement", "href": "#about"},
    {"label": "Our Model",          "href": "#model"},
    {"label": "Areas of Focus",     "href": "#focus"},
    {"label": "Leadership",         "href": "#leadership"},
    {"label": "Join Us",            "href": "https://forms.google.com"}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. RLS — only authenticated users can read; only President/Technical Head can write ───
ALTER TABLE footer_settings ENABLE ROW LEVEL SECURITY;

-- Anyone logged-in may read (footer also reads on public site via anon key)
CREATE POLICY "footer_settings_read"
  ON footer_settings FOR SELECT
  USING (true);

-- Only President and Technical Head may upsert
CREATE POLICY "footer_settings_write"
  ON footer_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('President', 'Technical Head')
    )
  );
