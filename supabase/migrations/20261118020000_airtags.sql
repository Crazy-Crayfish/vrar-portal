-- AirTags: a pool of the committee's AirTags, one of which goes out with
-- every hardware hand-off.
--
-- Decided 2026-11-18: AirTags are a pool, not paired to units. Admins keep
-- the list (each AirTag under the name it has in Find My); at hand-off the
-- admin picks a free one, which is required; once the hardware is returned
-- the AirTag is free again. There's no AirTag API: tracking happens in Find
-- My, and the app only records which AirTag went where.
--
-- "Free" is derived, like a unit's availability (20260926010000): an AirTag
-- is out while it's on a loan_request_items row with returned_at null whose
-- request is pending or approved. Nothing has to be cleared on return, and
-- a cancelled or denied request releases it on its own.
--
-- Safe to re-run.

-- ── Table ────────────────────────────────────────────────────────────────

create table if not exists public.airtags (
  id uuid primary key default gen_random_uuid(),
  -- As it appears in Find My, so the admin can find it there.
  name text not null check (length(trim(name)) > 0),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists airtags_name_unique on public.airtags (lower(trim(name)));

alter table public.airtags enable row level security;

drop policy if exists "Admins view AirTags" on public.airtags;
create policy "Admins view AirTags" on public.airtags
  for select to authenticated using (public.is_admin());

drop policy if exists "Admins add AirTags" on public.airtags;
create policy "Admins add AirTags" on public.airtags
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins edit AirTags" on public.airtags;
create policy "Admins edit AirTags" on public.airtags
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins remove AirTags" on public.airtags;
create policy "Admins remove AirTags" on public.airtags
  for delete to authenticated using (public.is_admin());

-- A policy alone isn't enough; see 20260817020000_equipment_grants.sql.
grant select, insert, update, delete on public.airtags to authenticated;
grant select, insert, update, delete on public.airtags to service_role;

-- ── Which AirTag went out with an item ──────────────────────────────────
-- airtag_name is a copy of the name at hand-off, so a loan still says which
-- AirTag it had after that AirTag is renamed or removed from the pool.

alter table public.loan_request_items
  add column if not exists airtag_id uuid,
  add column if not exists airtag_name text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'loan_request_items_airtag_id_fkey') then
    alter table public.loan_request_items
      add constraint loan_request_items_airtag_id_fkey
      foreign key (airtag_id) references public.airtags(id) on delete set null;
  end if;
end $$;

create index if not exists loan_request_items_airtag_id_idx
  on public.loan_request_items (airtag_id) where airtag_id is not null;

-- ── Is an AirTag out? ───────────────────────────────────────────────────

create or replace function public.airtag_is_out(p_airtag_id uuid, p_except_item_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from loan_request_items i
    join loan_requests r on r.id = i.loan_request_id
    where i.airtag_id = p_airtag_id
      and i.returned_at is null
      and r.status in ('pending', 'approved')
      and (p_except_item_id is null or i.id <> p_except_item_id)
  );
$$;

-- ── Guard: only an admin records an AirTag, and one AirTag per open loan ─
-- Members may insert their own loan_request_items rows (that's how a
-- checkout is submitted), so without this a member could put an AirTag on
-- their own request and keep it from going out with anyone else's.
-- Locking the AirTag row settles two admins picking the same one at once.
-- Also stamps the name copy, so it isn't trusted to the client.

create or replace function public.guard_loan_item_airtag()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.airtag_id is not distinct from old.airtag_id then
    -- Not a change of AirTag; keep the name copy as it was.
    new.airtag_name := old.airtag_name;
    return new;
  end if;

  if new.airtag_id is null then
    new.airtag_name := null;
    return new;
  end if;

  -- auth.uid() is null for the SQL editor and service-role scripts, which
  -- may do this, like the other guards (20260927020000).
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an administrator can record an AirTag';
  end if;

  perform 1 from airtags where id = new.airtag_id for update;
  if not found then
    raise exception 'airtag_not_found' using errcode = 'P0001';
  end if;

  if public.airtag_is_out(new.airtag_id, new.id) then
    raise exception 'airtag_in_use' using errcode = 'P0001';
  end if;

  new.airtag_name := (select name from airtags where id = new.airtag_id);
  return new;
end;
$$;

drop trigger if exists guard_loan_item_airtag on public.loan_request_items;
create trigger guard_loan_item_airtag
  before insert or update of airtag_id, airtag_name on public.loan_request_items
  for each row execute function public.guard_loan_item_airtag();

-- ── Guard: an AirTag that's out can't be removed ─────────────────────────
-- The loan would keep its name copy, but the AirTag would vanish from the
-- list while it's still travelling with someone's hardware.

create or replace function public.guard_airtag_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.airtag_is_out(old.id) then
    raise exception 'airtag_in_use' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_airtag_delete on public.airtags;
create trigger guard_airtag_delete
  before delete on public.airtags
  for each row execute function public.guard_airtag_delete();

-- Stamps who added it, so that isn't trusted to the client either.
create or replace function public.stamp_airtag_created_by()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_airtag_created_by on public.airtags;
create trigger stamp_airtag_created_by
  before insert on public.airtags
  for each row execute function public.stamp_airtag_created_by();

-- ── Audit ────────────────────────────────────────────────────────────────

create or replace function public.audit_airtag_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.audit_write(
      'inventory', 'airtag.created', 'airtag', new.id, new.name,
      'AirTag ' || new.name || ' was added'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.audit_write(
      'inventory', 'airtag.deleted', 'airtag', old.id, old.name,
      'AirTag ' || old.name || ' was removed'
    );
    return old;
  end if;

  v_changes := public.audit_changes(to_jsonb(old), to_jsonb(new), array['name', 'note']);
  if jsonb_array_length(v_changes) > 0 then
    perform public.audit_write(
      'inventory', 'airtag.updated', 'airtag', new.id, new.name,
      'AirTag ' || new.name || ' was edited',
      v_changes
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_airtag_audit on public.airtags;
create trigger on_airtag_audit
  after insert or update or delete on public.airtags
  for each row execute function public.audit_airtag_changes();

-- Its own entry rather than a field in loan_item.updated: "which AirTag went
-- with this?" is the question someone comes to the log with.
create or replace function public.audit_loan_item_airtag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_label text := public.audit_loan_item_label(new.equipment_id, new.equipment_unit_id);
begin
  if new.airtag_id is distinct from old.airtag_id then
    perform public.audit_write(
      'loans', 'loan_item.airtag_recorded', 'loan_request_item', new.id, v_label,
      case
        when new.airtag_name is null then 'The AirTag was removed from ' || v_label
        else 'AirTag ' || new.airtag_name || ' went out with ' || v_label
      end,
      jsonb_build_array(jsonb_build_object('field', 'airtag', 'from', old.airtag_name, 'to', new.airtag_name))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_loan_item_airtag_audit on public.loan_request_items;
create trigger on_loan_item_airtag_audit
  after update of airtag_id on public.loan_request_items
  for each row execute function public.audit_loan_item_airtag();

-- ── Out of the public API ───────────────────────────────────────────────
-- As 20261102000000 did for the rest: trigger functions and the internal
-- helper aren't for /rest/v1/rpc. The triggers run as the owner regardless.

do $$
declare
  v_function text;
  v_role text;
begin
  foreach v_function in array array[
    'public.airtag_is_out(uuid, uuid)',
    'public.guard_loan_item_airtag()',
    'public.guard_airtag_delete()',
    'public.stamp_airtag_created_by()',
    'public.audit_airtag_changes()',
    'public.audit_loan_item_airtag()'
  ] loop
    execute format('revoke all on function %s from public', v_function);
    foreach v_role in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = v_role) then
        execute format('revoke all on function %s from %I', v_function, v_role);
      end if;
    end loop;
  end loop;
end $$;
