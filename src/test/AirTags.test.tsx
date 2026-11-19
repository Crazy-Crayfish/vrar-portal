import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { useAuth } from '../context/AuthContext'
import {
  addAirTag,
  AirTagNameTakenError,
  deleteAirTag,
  fetchAirTags,
  peekAirTags,
  updateAirTag,
  type AirTag,
} from '../lib/airtags'
import AirTags from '../components/admin-dashboard/AirTags'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/airtags', async () => {
  const actual = await vi.importActual<typeof import('../lib/airtags')>('../lib/airtags')
  return {
    ...actual,
    fetchAirTags: vi.fn(),
    peekAirTags: vi.fn(),
    addAirTag: vi.fn(),
    updateAirTag: vi.fn(),
    deleteAirTag: vi.fn(),
  }
})

const freeTag: AirTag = { id: 'tag-1', name: 'VRAR-01', note: 'blue keyring', createdAt: '', out: null }
const outTag: AirTag = {
  id: 'tag-2',
  name: 'VRAR-02',
  note: null,
  createdAt: '',
  out: { itemId: 'item-7', itemName: 'Quest 3', memberName: 'Bob Reyes' },
}

beforeEach(() => {
  vi.mocked(fetchAirTags).mockReset().mockResolvedValue([freeTag, outTag])
  vi.mocked(peekAirTags).mockReset().mockReturnValue(null)
  vi.mocked(addAirTag).mockReset().mockResolvedValue(undefined)
  vi.mocked(updateAirTag).mockReset().mockResolvedValue(undefined)
  vi.mocked(deleteAirTag).mockReset().mockResolvedValue(undefined)
  vi.mocked(useAuth).mockReturnValue({
    session: { user: { id: 'admin-1' } } as unknown as Session,
    profile: { id: 'admin-1', first_name: 'Ada', last_name: 'Admin', role: 'admin', uw_email: 'ada@uw.edu', address: '' },
    loading: false,
    signOut: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>)
})

function renderAirTags() {
  const router = createMemoryRouter(
    [
      { path: '/adminHome/airtags', element: <AirTags /> },
      { path: '/adminHome/loans/:id', element: <p>Loan detail</p> },
    ],
    { initialEntries: ['/adminHome/airtags'] },
  )
  return render(<RouterProvider router={router} />)
}

function rowFor(name: string): HTMLElement {
  return screen.getByText(name).closest('li')!
}

describe('AirTags', () => {
  it('lists each AirTag as free or out with its loan', async () => {
    renderAirTags()

    expect(await screen.findByText('VRAR-01')).toBeInTheDocument()
    expect(screen.getByText('2 AirTags, 1 free')).toBeInTheDocument()
    expect(within(rowFor('VRAR-01')).getByText('Free')).toBeInTheDocument()
    expect(within(rowFor('VRAR-01')).getByText('blue keyring')).toBeInTheDocument()
    expect(within(rowFor('VRAR-02')).getByRole('button', { name: /out with quest 3 · bob reyes/i })).toBeInTheDocument()
  })

  it('opens the loan an AirTag is out with', async () => {
    renderAirTags()

    await userEvent.click(await screen.findByRole('button', { name: /out with quest 3/i }))

    expect(await screen.findByText('Loan detail')).toBeInTheDocument()
  })

  it('adds an AirTag by its Find My name', async () => {
    renderAirTags()

    await userEvent.type(await screen.findByLabelText('Name in Find My'), 'VRAR-03')
    await userEvent.type(screen.getByLabelText('Note (optional)'), 'red case')
    await userEvent.click(screen.getByRole('button', { name: 'Add AirTag' }))

    await waitFor(() => expect(addAirTag).toHaveBeenCalledWith({ name: 'VRAR-03', note: 'red case' }))
  })

  it('says so when the name is already taken', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(addAirTag).mockRejectedValue(new AirTagNameTakenError())
    renderAirTags()

    await userEvent.type(await screen.findByLabelText('Name in Find My'), 'vrar-01')
    await userEvent.click(screen.getByRole('button', { name: 'Add AirTag' }))

    expect(await screen.findByText('Another AirTag already has that name.')).toBeInTheDocument()
  })

  it("won't remove an AirTag that's out", async () => {
    renderAirTags()

    await screen.findByText('VRAR-02')
    expect(within(rowFor('VRAR-02')).getByRole('button', { name: 'Remove' })).toBeDisabled()
  })

  it('removes a free AirTag after asking', async () => {
    renderAirTags()

    await screen.findByText('VRAR-01')
    await userEvent.click(within(rowFor('VRAR-01')).getByRole('button', { name: 'Remove' }))
    expect(screen.getByText('Remove VRAR-01?')).toBeInTheDocument()
    await userEvent.click(within(rowFor('VRAR-01')).getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(deleteAirTag).toHaveBeenCalledWith('tag-1'))
  })

  it('renames an AirTag', async () => {
    renderAirTags()

    await screen.findByText('VRAR-01')
    await userEvent.click(within(rowFor('VRAR-01')).getByRole('button', { name: 'Edit' }))
    const nameInput = screen.getByDisplayValue('VRAR-01')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'VRAR-01A')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(updateAirTag).toHaveBeenCalledWith('tag-1', { name: 'VRAR-01A', note: 'blue keyring' }))
  })
})
