-- Takes record_inventory_audit away from signed-out callers.
--
-- Postgres grants EXECUTE on every new function to PUBLIC, and Supabase's
-- default privileges grant it to anon as well. 20260924000000 only added a
-- grant to authenticated, so the function stayed callable through
-- /rest/v1/rpc/record_inventory_audit with nothing but the anon key, and
-- Supabase's security advisor flagged it.
--
-- It was never exploitable: the body refuses anyone who isn't an admin
-- (auth.uid() is null for anon, so the check fails and nothing is written).
-- This removes the grant as well, so the refusal no longer depends on that
-- one check. Admins call it signed in, through the authenticated grant,
-- which stays.
--
-- Safe to re-run.

revoke all on function public.record_inventory_audit(jsonb, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.record_inventory_audit(jsonb, text) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.record_inventory_audit(jsonb, text) to authenticated;
  end if;
end $$;
