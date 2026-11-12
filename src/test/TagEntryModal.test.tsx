import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchEquipmentUnitBySerial } from '../lib/inventory'
import { TagEntryModal } from '../components/admin-dashboard/TagEntryModal'

vi.mock('../lib/inventory', () => ({ fetchEquipmentUnitBySerial: vi.fn() }))

// The scanner hook is replaced so a test can "scan" by calling detectBarcode.
let detectBarcode: ((value: string) => void) | undefined
vi.mock('../hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: (onDetected: (value: string) => void) => {
    detectBarcode = onDetected
    return { videoRef: { current: null }, isSupported: true, permissionError: null }
  },
}))

function renderModal(count = 2) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <TagEntryModal
      count={count}
      heading="Scan the tags"
      confirmLabel="Add units"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

beforeEach(() => {
  detectBarcode = undefined
  vi.mocked(fetchEquipmentUnitBySerial).mockReset().mockResolvedValue(null)
})

describe('TagEntryModal', () => {
  it('starts empty and cannot be confirmed yet', () => {
    renderModal()

    expect(screen.getByText(/0 of 2 added/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add units' })).toBeDisabled()
  })

  it('takes a scanned tag, upper-cased and trimmed', async () => {
    renderModal()

    detectBarcode?.(' 1199887a ')

    expect(await screen.findByText('1199887A')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 added/)).toBeInTheDocument()
    expect(fetchEquipmentUnitBySerial).toHaveBeenCalledWith('1199887A')
  })

  it('takes a typed tag the same way, on Enter', async () => {
    renderModal()

    await userEvent.type(screen.getByLabelText('Tag number'), '2200001{Enter}')

    expect(await screen.findByText('2200001')).toBeInTheDocument()
    expect(screen.getByLabelText('Tag number')).toHaveValue('')
  })

  it('refuses a tag already in the list', async () => {
    renderModal()
    detectBarcode?.('111')
    await screen.findByText('111')

    detectBarcode?.('111')

    expect(await screen.findByText('111 is already in this list.')).toBeInTheDocument()
    expect(screen.getByText(/1 of 2 added/)).toBeInTheDocument()
  })

  it('refuses a tag that is already on a unit in inventory, and names the product', async () => {
    vi.mocked(fetchEquipmentUnitBySerial).mockResolvedValue({
      unit: { id: 'u-1' },
      equipment: { name: 'Quest 3' },
    } as never)
    renderModal()

    detectBarcode?.('999')

    expect(await screen.findByText('999 is already in inventory as Quest 3.')).toBeInTheDocument()
    expect(screen.getByText(/0 of 2 added/)).toBeInTheDocument()
  })

  it('says so, and adds nothing, when the inventory check fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetchEquipmentUnitBySerial).mockRejectedValue(new Error('network'))
    renderModal()

    detectBarcode?.('999')

    expect(await screen.findByText('Could not check 999 against inventory. Try again.')).toBeInTheDocument()
    expect(screen.getByText(/0 of 2 added/)).toBeInTheDocument()
  })

  it('confirms with every tag, in the order they were added, once full', async () => {
    const { onConfirm } = renderModal()
    detectBarcode?.('111')
    await screen.findByText('111')
    detectBarcode?.('222')
    await screen.findByText('222')

    await userEvent.click(screen.getByRole('button', { name: 'Add units' }))

    expect(onConfirm).toHaveBeenCalledWith(['111', '222'])
  })

  it('lets a wrong tag be removed and replaced', async () => {
    const { onConfirm } = renderModal(1)
    detectBarcode?.('111')
    await screen.findByText('111')

    await userEvent.click(screen.getByRole('button', { name: 'Remove 111' }))
    expect(screen.getByRole('button', { name: 'Add units' })).toBeDisabled()

    detectBarcode?.('222')
    await screen.findByText('222')
    await userEvent.click(screen.getByRole('button', { name: 'Add units' }))

    expect(onConfirm).toHaveBeenCalledWith(['222'])
  })

  it('cancels without confirming', async () => {
    const { onConfirm, onCancel } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
