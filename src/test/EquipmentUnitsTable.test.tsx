import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  addEquipmentUnit,
  fetchEquipmentUnitBySerial,
  fetchEquipmentUnitsWithStatus,
  setEquipmentUnitOnHold,
  UnitInUseError,
  type EquipmentUnitWithStatus,
} from '../lib/inventory'
import { EquipmentUnitsTable } from '../components/admin-dashboard/EquipmentUnitsTable'
import type { EquipmentUnit } from '../types'

// UnitInUseError stays real: the table tells it apart with instanceof.
vi.mock('../lib/inventory', async () => {
  const actual = await vi.importActual<typeof import('../lib/inventory')>('../lib/inventory')
  return {
    ...actual,
    fetchEquipmentUnitsWithStatus: vi.fn(),
    setEquipmentUnitOnHold: vi.fn(),
    addEquipmentUnit: vi.fn(),
    fetchEquipmentUnitBySerial: vi.fn(),
    deleteEquipmentUnit: vi.fn(),
    setEquipmentQuantityTotal: vi.fn(),
  }
})

let detectBarcode: ((value: string) => void) | undefined
vi.mock('../hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: (onDetected: (value: string) => void) => {
    detectBarcode = onDetected
    return { videoRef: { current: null }, isSupported: true, permissionError: null }
  },
}))

function unit(id: string, serial: string, overrides: Partial<EquipmentUnit> = {}): EquipmentUnit {
  return {
    id,
    equipment_id: 'eq-1',
    serial_number: serial,
    created_at: '2026-01-01T00:00:00Z',
    on_hold_at: null,
    on_hold_by: null,
    ...overrides,
  }
}

const free = unit('u-1', 'SYN-AAA111')
const held = unit('u-2', 'SYN-BBB222', { on_hold_at: '2026-10-01T00:00:00Z', on_hold_by: 'admin-1' })
const requested = unit('u-3', 'SYN-CCC333')

const rows: EquipmentUnitWithStatus[] = [
  { unit: free, status: 'available' },
  { unit: held, status: 'on_hold' },
  { unit: requested, status: 'requested' },
]

function rowFor(serial: string) {
  return screen.getByText(serial).closest('tr') as HTMLElement
}

beforeEach(() => {
  vi.mocked(fetchEquipmentUnitsWithStatus).mockReset().mockResolvedValue(rows)
  vi.mocked(setEquipmentUnitOnHold).mockReset()
  vi.mocked(addEquipmentUnit).mockReset()
  vi.mocked(fetchEquipmentUnitBySerial).mockReset().mockResolvedValue(null)
  detectBarcode = undefined
})

describe('EquipmentUnitsTable — putting units on hold', () => {
  it('shows a held unit as on hold, and offers holding only a free one', async () => {
    render(<EquipmentUnitsTable equipmentId="eq-1" />)

    expect(await screen.findByText('on hold')).toBeInTheDocument()
    expect(within(rowFor('SYN-AAA111')).getByRole('button', { name: 'Put SYN-AAA111 on hold' })).toBeEnabled()
    expect(within(rowFor('SYN-BBB222')).getByRole('button', { name: 'Take SYN-BBB222 off hold' })).toBeEnabled()
    // A requested unit belongs to its request.
    expect(within(rowFor('SYN-CCC333')).getByRole('button', { name: 'Put SYN-CCC333 on hold' })).toBeDisabled()
  })

  it('puts a free unit on hold and takes it off again', async () => {
    vi.mocked(setEquipmentUnitOnHold)
      .mockResolvedValueOnce({ ...free, on_hold_at: '2026-10-02T00:00:00Z' })
      .mockResolvedValueOnce(free)

    render(<EquipmentUnitsTable equipmentId="eq-1" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Put SYN-AAA111 on hold' }))

    expect(setEquipmentUnitOnHold).toHaveBeenCalledWith('u-1', true)
    expect(within(rowFor('SYN-AAA111')).getByText('on hold')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Take SYN-AAA111 off hold' }))

    expect(setEquipmentUnitOnHold).toHaveBeenLastCalledWith('u-1', false)
    expect(within(rowFor('SYN-AAA111')).getByText('available')).toBeInTheDocument()
  })

  it('says so, and shows the real status, when a member requested it first', async () => {
    vi.mocked(setEquipmentUnitOnHold).mockRejectedValue(new UnitInUseError())
    vi.mocked(fetchEquipmentUnitsWithStatus)
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([{ unit: free, status: 'requested' }, rows[1], rows[2]])

    render(<EquipmentUnitsTable equipmentId="eq-1" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Put SYN-AAA111 on hold' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/just requested this unit.*SYN-AAA111/)
    expect(await within(rowFor('SYN-AAA111')).findByText('requested')).toBeInTheDocument()
  })
})

describe('EquipmentUnitsTable — adding a unit', () => {
  it('asks for the unit\u2019s tag and adds the unit under it', async () => {
    const added = unit('u-9', '1199887')
    vi.mocked(addEquipmentUnit).mockResolvedValue(added)
    render(<EquipmentUnitsTable equipmentId="eq-1" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add unit' }))
    detectBarcode?.('1199887')
    await within(screen.getByRole('dialog')).findByText('1199887')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add unit' }))

    expect(addEquipmentUnit).toHaveBeenCalledWith('eq-1', '1199887')
    expect(await screen.findByText('1199887')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('adds nothing when the tag dialog is cancelled', async () => {
    render(<EquipmentUnitsTable equipmentId="eq-1" />)

    await userEvent.click(await screen.findByRole('button', { name: 'Add unit' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(addEquipmentUnit).not.toHaveBeenCalled()
  })
})
