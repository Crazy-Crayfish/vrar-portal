-- Takes the internal functions out of the public API.
--
-- Postgres grants EXECUTE on every new function to PUBLIC, and Supabase's
-- default privileges grant it to anon and authenticated as well, so every
-- function in `public` is callable through `/rest/v1/rpc/<name>` unless a
-- migration revokes it. 20260921000000_audit_log.sql did that for the
-- audit-log helpers; nothing did it for the rest.
--
-- The one that matters is notify_email_event. It is SECURITY DEFINER and
-- posts straight to the send-email Edge Function with the project's secret
-- key, so anyone with the anon key, signed in or not, could make the app send
-- real emails from the organisation's address, for any event and any record,
-- as often as they liked. Only the email triggers should call it, and they
-- run as the function owner, which these revokes don't affect.
--
-- The trigger functions are revoked too. They were never usable through the
-- API (Postgres refuses to run a function returning `trigger` outside a
-- trigger, as that migration notes), but leaving them executable keeps
-- dozens of false alarms in Supabase's security advisor, where a real one
-- like the above is easy to miss. A trigger fires regardless of EXECUTE.
--
-- Still callable by signed-in users, on purpose, because the app calls them:
-- is_admin, available_equipment_units, equipment_availability and
-- record_inventory_audit (which checks for an admin itself).
--
-- Also pins the search_path of the two functions that left it open, so a
-- caller's own schema can't shadow what they refer to.
--
-- Safe to re-run.

do $$
declare
  v_function text;
  v_role text;
begin
  for v_function in
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.prorettype = 'trigger'::regtype or p.proname = 'notify_email_event')
  loop
    execute format('revoke all on function %s from public', v_function);

    -- Guarded so this file still applies on a plain Postgres, where
    -- Supabase's roles don't exist.
    foreach v_role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = v_role) then
        execute format('revoke all on function %s from %I', v_function, v_role);
      end if;
    end loop;
  end loop;
end $$;

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.audit_changes(jsonb, jsonb, text[], jsonb) set search_path = public, pg_temp;
