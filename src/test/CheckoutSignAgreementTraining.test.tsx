import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { useAuth } from '../context/AuthContext'
import { fetchAvailableEquipmentUnit, fetchEquipment, fetchEquipmentByIds } from '../lib/inventory'
import CheckoutSignAgreement from '../components/user-dashboard/CheckoutSignAgreement'
import type { Equipment } from '../types'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))

vi.mock('../lib/inventory', async () => {
  const actual = await vi.importActual<typeof import('../lib/inventory')>('../lib/inventory')
  return {
    ...actual,
    fetchEquipment: vi.fn(),
    fetchEquipmentByIds: vi.fn(),
    fetchAvailableEquipmentUnit: vi.fn(),
  }
})

vi.mock('../lib/loanAgreementPdf', () => ({
  preloadAgreementPdfLib: () => undefined,
  buildLoanAgreementPdf: vi.fn(async () => ({ output: () => new Blob(['pdf'], { type: 'application/pdf' }) })),
}))

const quest = {
  id: 'eq-quest',
  name: 'Quest 3',
  description: 'Headset',
  image_url: null,
  product_type: 'hardware',
  category: 'virtual_reality',
  quantity_total: 2,
  replacement_value: 500,
  documentation_url: 'https://example.com/quest-training',
} as unknown as Equipment

let landedState: Record<string, unknown> | null = null

function AvailabilityStep() {
  landedState = useLocation().state as Record<string, unknown>
  return <p>Availability step</p>
}

beforeEach(() => {
  landedState = null
  vi.mocked(fetchEquipment).mockReset().mockResolvedValue(quest)
  vi.mocked(fetchEquipmentByIds).mockReset().mockResolvedValue([])
  vi.mocked(fetchAvailableEquipmentUnit).mockReset().mockResolvedValue({
    id: 'unit-1',
    equipment_id: 'eq-quest',
    serial_number: '1199887',
    created_at: '2026-01-01T00:00:00Z',
    on_hold_at: null,
    on_hold_by: null,
  })
  vi.mocked(useAuth).mockReturnValue({
    session: { user: { id: 'member-1', email: 'bob@uw.edu' } } as unknown as Session,
    profile: {
      id: 'member-1',
      first_name: 'Bob',
      last_name: 'Reyes',
      role: 'member',
      uw_email: 'bob@uw.edu',
      student_id: '1234567',
      phone: '555',
      address: '1 Way',
    },
    loading: false,
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
})

function renderSign() {
  const router = createMemoryRouter(
    [
      { path: '/home/checkout/sign', element: <CheckoutSignAgreement /> },
      { path: '/home/checkout/availability', element: <AvailabilityStep /> },
    ],
    {
      initialEntries: [
        {
          pathname: '/home/checkout/sign',
          state: { equipmentId: 'eq-quest', optionalAddonIds: [], requiredAddonId: null, returnDates: { 'eq-quest': '2026-12-01' } },
        },
      ],
    },
  )
  return render(<RouterProvider router={router} />)
}

describe('CheckoutSignAgreement — training confirmation', () => {
  it("won't continue until the training material is confirmed, then carries the confirmation forward", async () => {
    const user = userEvent.setup()
    renderSign()

    await user.type(await screen.findByPlaceholderText('Your full legal name'), 'Bob Reyes')
    const next = screen.getByRole('button', { name: 'next' })
    expect(next).toBeDisabled()

    expect(screen.getByRole('link', { name: /open the training material for quest 3/i })).toHaveAttribute(
      'href',
      'https://example.com/quest-training',
    )
    await user.click(screen.getByRole('checkbox', { name: /i have read the training material for quest 3/i }))
    expect(next).toBeEnabled()

    await user.click(next)
    expect(await screen.findByText('Availability step')).toBeInTheDocument()
    const confirmed = (landedState?.trainingConfirmedAt as Record<string, string> | undefined)?.['eq-quest'] ?? ''
    expect(Number.isNaN(Date.parse(confirmed))).toBe(false)
  })

  it('asks for no confirmation when the item has no training link', async () => {
    vi.mocked(fetchEquipment).mockResolvedValue({ ...quest, documentation_url: null })
    const user = userEvent.setup()
    renderSign()

    await user.type(await screen.findByPlaceholderText('Your full legal name'), 'Bob Reyes')

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'next' })).toBeEnabled()
  })
})
