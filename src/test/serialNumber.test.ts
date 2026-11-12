import { normalizeSerialNumber } from '../lib/serialNumber'

// Shared by the scan-based checkout, the return flow, the hand-off
// verification and the inventory audit. All four look a unit up by the result,
// so a change here changes whether barcodes match in every one of them.
describe('normalizeSerialNumber', () => {
  it('trims and upper-cases what a reader or a typist hands it', () => {
    expect(normalizeSerialNumber('  syn-hjxpp41t5 ')).toBe('SYN-HJXPP41T5')
  })

  // UW property tags have no prefix of ours, so nothing is added.
  it('does not add a prefix', () => {
    expect(normalizeSerialNumber('hjxpp41t5')).toBe('HJXPP41T5')
    expect(normalizeSerialNumber('123456')).toBe('123456')
  })

  it('returns nothing for nothing', () => {
    expect(normalizeSerialNumber('')).toBe('')
    expect(normalizeSerialNumber('   ')).toBe('')
  })
})
