-- Aawaaj Admin Dashboard schema with RLS policies

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_enum') then
    create type public.role_enum as enum ('President', 'Regional Head', 'University President', 'Volunteer');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_type_enum') then
    create type public.submission_type_enum as enum ('Victim Report', 'Volunteer Application');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_status_enum') then
    create type public.submission_status_enum as enum ('New', 'In-Progress', 'Resolved');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text unique not null,
  role public.role_enum not null default 'Volunteer',
  region text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  submission_type public.submission_type_enum not null,
  full_name text not null,
  email text not null,
  phone text,
  region text not null,
  details text not null,
  status public.submission_status_enum not null default 'New',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  metadata jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_region on public.profiles (region);
create index if not exists idx_submissions_region on public.submissions (region);
create index if not exists idx_submissions_status on public.submissions (status);
create index if not exists idx_audit_logs_admin on public.audit_logs (admin_id);

create or replace function public.get_my_role()
returns public.role_enum
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.get_my_region()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select region from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_role() from public;
revoke all on function public.get_my_region() from public;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_region() to authenticated;

alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles policies
drop policy if exists profiles_president_all on public.profiles;
create policy profiles_president_all
on public.profiles
for all
to authenticated
using (public.get_my_role() = 'President')
with check (public.get_my_role() = 'President');

drop policy if exists profiles_regional_scope on public.profiles;
create policy profiles_regional_scope
on public.profiles
for all
to authenticated
using (
  public.get_my_role() = 'Regional Head'
  and region = public.get_my_region()
)
with check (
  public.get_my_role() = 'Regional Head'
  and region = public.get_my_region()
);

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- Submissions policies
drop policy if exists submissions_president_all on public.submissions;
create policy submissions_president_all
on public.submissions
for all
to authenticated
using (public.get_my_role() = 'President')
with check (public.get_my_role() = 'President');

drop policy if exists submissions_regional_scope on public.submissions;
create policy submissions_regional_scope
on public.submissions
for all
to authenticated
using (
  public.get_my_role() = 'Regional Head'
  and region = public.get_my_region()
)
with check (
  public.get_my_role() = 'Regional Head'
  and region = public.get_my_region()
);

drop policy if exists submissions_university_read on public.submissions;
create policy submissions_university_read
on public.submissions
for select
to authenticated
using (public.get_my_role() = 'University President');

-- Audit logs policies
drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read
on public.audit_logs
for select
to authenticated
using (
  public.get_my_role() = 'President'
  or (public.get_my_role() = 'Regional Head' and admin_id = auth.uid())
  or (public.get_my_role() = 'University President' and admin_id = auth.uid())
);

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs
for insert
to authenticated
with check (
  admin_id = auth.uid()
  and public.get_my_role() in ('President', 'Regional Head', 'University President')
);
