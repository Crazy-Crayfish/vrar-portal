import { supabase } from './supabase'
import { CACHE_KEYS, DISPLAY_REUSE_MS, invalidate, peekValue, refresh } from './queryCache'

/**
 * The committee's AirTags. A pool, not paired to units: at hand-off the
 * admin picks a free one, and it's free again once the hardware is back.
 * See supabase/migrations/20261118020000_airtags.sql.
 */
export interface AirTag {
  id: string
  /** As it appears in Find My. */
  name: string
  note: string | null
  createdAt: string
  /** The loan it's out with, or null when it's free. */
  out: AirTagLoan | null
}

export interface AirTagLoan {
  /** loan_request_items.id, which the loan detail route takes. */
  itemId: string
  itemName: string
  memberName: string | null
}

/** A write the database refused because the AirTag is out with a loan. */
export class AirTagInUseError extends Error {
  constructor(message = 'That AirTag is already out with another loan.') {
    super(message)
    this.name = 'AirTagInUseError'
  }
}

/** A name another AirTag already has (names are compared ignoring case). */
export class AirTagNameTakenError extends Error {
  constructor(message = 'Another AirTag already has that name.') {
    super(message)
    this.name = 'AirTagNameTakenError'
  }
}

export function isAirTagInUse(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'message' in error && String(error.message).includes('airtag_in_use')
}

function toWriteError(error: { code?: string; message?: string }): Error {
  if (error.code === '23505') return new AirTagNameTakenError()
  if (isAirTagInUse(error)) return new AirTagInUseError('That AirTag is out with a loan. It can be removed once the hardware is back.')
  return error as Error
}

interface AirTagRow {
  id: string
  name: string
  note: string | null
  created_at: string
}

interface OpenItemRow {
  id: string
  airtag_id: string
  equipment_id: string
  loan_request_id: string
}

async function loadAirTags(): Promise<AirTag[]> {
  const [{ data: tags, error: tagsError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('airtags').select('id, name, note, created_at').order('name'),
    supabase
      .from('loan_request_items')
      .select('id, airtag_id, equipment_id, loan_request_id')
      .not('airtag_id', 'is', null)
      .is('returned_at', null),
  ])
  if (tagsError) throw tagsError
  if (itemsError) throw itemsError

  const openItems = (items ?? []) as OpenItemRow[]
  const requestIds = [...new Set(openItems.map((item) => item.loan_request_id))]
  const equipmentIds = [...new Set(openItems.map((item) => item.equipment_id))]

  const [{ data: requests, error: requestsError }, { data: equipment, error: equipmentError }] = await Promise.all([
    requestIds.length
      ? supabase.from('loan_requests').select('id, status, user_id').in('id', requestIds)
      : Promise.resolve({ data: [], error: null }),
    equipmentIds.length
      ? supabase.from('equipment').select('id, name').in('id', equipmentIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (requestsError) throw requestsError
  if (equipmentError) throw equipmentError

  // Same rule as the database's airtag_is_out: a cancelled or denied
  // request has let its AirTag go.
  const liveRequests = new Map(
    ((requests ?? []) as { id: string; status: string; user_id: string }[])
      .filter((request) => request.status === 'pending' || request.status === 'approved')
      .map((request) => [request.id, request]),
  )
  const userIds = [...new Set([...liveRequests.values()].map((request) => request.user_id))]
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds)
    : { data: [], error: null }
  if (profilesError) throw profilesError

  const equipmentNames = new Map(((equipment ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]))
  const memberNames = new Map(
    ((profiles ?? []) as { id: string; first_name: string; last_name: string }[]).map((row) => [
      row.id,
      `${row.first_name} ${row.last_name}`,
    ]),
  )

  const outByTag = new Map<string, AirTagLoan>()
  for (const item of openItems) {
    const request = liveRequests.get(item.loan_request_id)
    if (!request) continue
    outByTag.set(item.airtag_id, {
      itemId: item.id,
      itemName: equipmentNames.get(item.equipment_id) ?? 'Removed item',
      memberName: memberNames.get(request.user_id) ?? null,
    })
  }

  return ((tags ?? []) as AirTagRow[]).map((tag) => ({
    id: tag.id,
    name: tag.name,
    note: tag.note,
    createdAt: tag.created_at,
    out: outByTag.get(tag.id) ?? null,
  }))
}

/**
 * Every AirTag, with the loan each one is out with. Pass `{ fresh: true }`
 * when choosing one (the hand-off picker); the list screen may reuse a copy
 * from the last few seconds.
 */
export function fetchAirTags(options: { fresh?: boolean } = {}): Promise<AirTag[]> {
  return refresh(CACHE_KEYS.airtags, loadAirTags, options.fresh ? 0 : DISPLAY_REUSE_MS)
}

/** As last loaded, synchronously, or null. Display only. */
export function peekAirTags(): AirTag[] | null {
  return peekValue<AirTag[]>(CACHE_KEYS.airtags) ?? null
}

function cleanNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim() ?? ''
  return trimmed ? trimmed : null
}

export async function addAirTag(input: { name: string; note?: string | null }): Promise<void> {
  try {
    const { error } = await supabase.from('airtags').insert({ name: input.name.trim(), note: cleanNote(input.note) })
    if (error) throw toWriteError(error)
  } finally {
    invalidate(CACHE_KEYS.airtags)
  }
}

export async function updateAirTag(id: string, input: { name: string; note?: string | null }): Promise<void> {
  try {
    const { error } = await supabase
      .from('airtags')
      .update({ name: input.name.trim(), note: cleanNote(input.note) })
      .eq('id', id)
    if (error) throw toWriteError(error)
  } finally {
    invalidate(CACHE_KEYS.airtags)
  }
}

export async function deleteAirTag(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('airtags').delete().eq('id', id)
    if (error) throw toWriteError(error)
  } finally {
    invalidate(CACHE_KEYS.airtags)
  }
}
