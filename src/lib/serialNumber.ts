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
