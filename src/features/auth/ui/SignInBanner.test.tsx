import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInBanner } from './SignInBanner'

// Mock the auth store
const mockStore = {
  status: 'idle' as string,
  error: null as string | null,
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
    mockStore.error = null
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

  it('opens consent dialog instead of calling signIn directly', async () => {
    const user = userEvent.setup()
    render(<SignInBanner />)

    // Click "Sign in" — should open consent dialog, NOT call signIn yet
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(mockStore.signIn).not.toHaveBeenCalled()

    // Consent dialog should now be visible
    expect(screen.getByText(/before you sign in/i)).toBeInTheDocument()
  })

  it('calls signIn when consent dialog continue button is clicked', async () => {
    const user = userEvent.setup()
    render(<SignInBanner />)

    // Open consent dialog
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Click "I understand, continue to Google"
    await user.click(screen.getByRole('button', { name: /i understand/i }))
    expect(mockStore.signIn).toHaveBeenCalled()
  })

  it('closes consent dialog without signing in when cancelled', async () => {
    const user = userEvent.setup()
    render(<SignInBanner />)

    // Open consent dialog
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(screen.getByText(/before you sign in/i)).toBeInTheDocument()

    // Click Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Dialog should close and signIn should NOT be called
    expect(mockStore.signIn).not.toHaveBeenCalled()
  })

  it('shows error message when auth has error', () => {
    mockStore.error = 'Something went wrong'
    render(<SignInBanner />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })
})
