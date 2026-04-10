import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInBanner } from './SignInBanner'

// Mock the auth store
const mockStore = {
  status: 'idle' as string,
  signIn: vi.fn().mockResolvedValue(undefined),
  dismissed: false,
  dismissBanner: vi.fn(),
}

vi.mock('../model/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
    { getState: () => mockStore },
  ),
}))

describe('SignInBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.status = 'idle'
    mockStore.dismissed = false
  })

  it('renders sign-in prompt when not authenticated', () => {
    render(<SignInBanner />)
    expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
  })

  it('hides when user is authenticated', () => {
    mockStore.status = 'authenticated'
    render(<SignInBanner />)
    expect(screen.queryByText(/sign in with google/i)).not.toBeInTheDocument()
  })

  it('hides when dismissed', () => {
    mockStore.dismissed = true
    render(<SignInBanner />)
    expect(screen.queryByText(/sign in with google/i)).not.toBeInTheDocument()
  })

  it('calls dismiss when dismiss button clicked', async () => {
    const user = userEvent.setup()
    render(<SignInBanner />)

    await user.click(screen.getByLabelText(/dismiss/i))
    expect(mockStore.dismissBanner).toHaveBeenCalled()
  })

  it('calls signIn when sign-in link clicked', async () => {
    const user = userEvent.setup()
    render(<SignInBanner />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(mockStore.signIn).toHaveBeenCalled()
  })
})
