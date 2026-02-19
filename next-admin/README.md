# Aawaaj Admin Dashboard (Next.js + Supabase)

Secure Admin Dashboard for Aawaaj Movement using Next.js App Router, Supabase Auth/Postgres, Tailwind CSS, React Hook Form, and Zod.

## Features

- Secure Supabase email/password authentication
- Protected `/admin` routes via server middleware
- Role-aware access (President, Regional Head, University President)
- President-only user management:
  - Invite user by email
  - Assign/revoke roles
  - Delete account
- Submissions table with search and victim-report status updates
- Audit log entries for critical admin actions
- Inactivity session auto-logout
- Dashboard Bento grid with Aawaaj color accents

## Setup

1. Copy `.env.example` to `.env.local` and fill values.
2. Run SQL in `supabase/schema.sql` inside Supabase SQL editor.
3. Install dependencies and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- User management endpoints are President-only and server-validated.
- RLS must remain enabled for all tables.
