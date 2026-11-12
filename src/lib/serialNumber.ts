const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const GENERATED_SUFFIX_LENGTH = 9

function randomSuffix(): string {
  let result = ''
  for (let i = 0; i < GENERATED_SUFFIX_LENGTH; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return result
}

// TEMPORARY: units are meant to carry UW-issued barcodes, which an admin will
// type or scan when adding a unit. Until that entry flow exists, new units
// still get a made-up serial of the form SYN-XXXXXXXXX (9 random uppercase
// letters/digits, unique within the batch). Remove with the entry flow.
export function generateSerialNumbers(count: number): string[] {
  const serials = new Set<string>()
  while (serials.size < count) {
    serials.add(`${SERIAL_PREFIX}${randomSuffix()}`)
  }
  return Array.from(serials)
}

const SERIAL_PREFIX = 'SYN-'

/**
 * Turns whatever a barcode reader or a typed field produced into the form
 * serial numbers are stored in: trimmed and upper-cased. The text is
 * otherwise taken as it comes, because UW property tags have no prefix of
 * ours to add.
 *
 * Every flow that looks a unit up by scan or by hand goes through this — the
 * scan-based checkout and return hooks, the hand-off verification, and the
 * inventory audit — because a lookup that normalises differently from the
 * one next to it is a bug nobody sees until a barcode stops matching.
 */
export function normalizeSerialNumber(raw: string): string {
  return raw.trim().toUpperCase()
}
