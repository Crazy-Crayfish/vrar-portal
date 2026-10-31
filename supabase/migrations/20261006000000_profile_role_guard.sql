-- Members can edit their own profile, but must not be able to change their
-- own role.
--
-- "Users can update own profile" (20260816000000_profiles_baseline.sql)
-- checks only that the row is the caller's, and `authenticated` holds UPDATE
-- on every column, while `enforce_member_role` runs only on insert. Without
-- this guard a signed-in member could set their own `role` to 'admin' with a
-- single PostgREST update from the browser console, and with it read every
-- member's personal details and every signed agreement.
--
-- A role change is allowed only from an existing admin (the "Change to
-- admin"/"Change to member" button, through "Admins update profiles") or with
-- no signed-in user at all: the SQL editor, a service-role script or an Edge
-- Function, which is how the first admin is promoted. Every other column is
-- still the member's to edit.
--
-- Safe to re-run.

create or replace function public.guard_profile_role_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a member''s role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_role_update() from public, anon, authenticated;

drop trigger if exists guard_profile_role_update on public.profiles;
create trigger guard_profile_role_update
  before update on public.profiles
  for each row execute function public.guard_profile_role_update();
