-- The starting point the rest of this directory assumes but never creates.
--
-- `profiles` predates this repo's migration history: it was set up by hand
-- in the original project, and every migration from 20260817000000 onwards
-- refers to it (the very first one in its equipment policies). On a fresh
-- project those migrations fail at the first reference. This recreates the
-- table as it stands in the original project's live database, taken from its
-- catalog (columns, constraints, the owner policies, and the two triggers
-- that aren't added by a later migration), so a new project can be built by
-- running this directory in filename order. Its version sorts before every
-- other migration for that reason.
--
-- Two deliberate differences from the original:
--
--   * `discord` allows null. The fork doesn't use Discord, and a column that
--     can be left empty can be dropped from the app without another
--     migration. Profile setup still fills it in until then.
--   * Only the grants the app needs. The original also carried TRUNCATE,
--     REFERENCES and TRIGGER for `anon` and `authenticated`, which nothing
--     uses; TRUNCATE in particular ignores row-level security.
--
-- The audit and email triggers on `profiles` come later, from
-- 20260906000000_email_templates.sql and 20260921000000_audit_log.sql, and
-- the admin read/update policies from
-- 20260916000000_profiles_admin_visibility_fix.sql. Members can change their
-- own row but not their role: see 20261006000000_profile_role_guard.sql.
--
-- Safe to re-run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text not null,
  student_id text not null,
  uw_email text not null unique,
  address text not null,
  discord text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role text not null default 'member' check (role in ('member', 'admin'))
);

alter table public.profiles alter column discord drop not null;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- A policy only filters rows within a privilege that has already been
-- granted (see 20260817020000_equipment_grants.sql). No delete for members:
-- an account is removed through the delete-user Edge Function, which runs as
-- the service role, and the row goes with its auth.users row.
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- New rows are always members, whatever the insert asks for. Only a
-- service-role change, or an existing admin, can make someone an admin.
create or replace function public.enforce_member_role_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.role := 'member';
  return new;
end;
$$;

drop trigger if exists enforce_member_role on public.profiles;
create trigger enforce_member_role
  before insert on public.profiles
  for each row execute function public.enforce_member_role_on_insert();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- `loans` is another table from before this history. Nothing in the app reads
-- or writes it, but 20260914061000_loan_approval_audit.sql and
-- 20260927010000_loans_legacy_fk_cleanup.sql both alter it, so on a fresh
-- project they would fail without it. This is the least they need; it is
-- dropped again by 20261006010000_drop_legacy_loans.sql once they have run.
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid
);

alter table public.loans enable row level security;
revoke all on public.loans from anon, authenticated;
