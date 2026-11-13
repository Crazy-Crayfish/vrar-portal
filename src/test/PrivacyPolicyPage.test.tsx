import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage'

describe('PrivacyPolicyPage', () => {
  it('renders the policy without needing a signed-in user', () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /information we collect/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /how long we keep it/i })).toBeInTheDocument()
  })
})
