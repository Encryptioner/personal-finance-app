import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileMenu } from './ProfileMenu'

const mockSignOut = vi.fn().mockResolvedValue(undefined)

const mockStore = {
  profile: null as { email: string; name: string; picture: string } | null,
  signOut: mockSignOut,
}

vi.mock('../model/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
    { getState: () => mockStore },
  ),
}))

describe('ProfileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.profile = null
  })

  it('renders nothing when no profile', () => {
    const { container } = render(<ProfileMenu />)
    expect(container.innerHTML).toBe('')
  })

  it('renders avatar and name when authenticated', () => {
    mockStore.profile = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://pic.url/photo.jpg',
    }

    render(<ProfileMenu />)

    expect(screen.getByAltText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('shows sign-out option on click', async () => {
    const user = userEvent.setup()
    mockStore.profile = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://pic.url/photo.jpg',
    }

    render(<ProfileMenu />)

    const button = screen.getByRole('button', { name: /test user/i })
    await user.click(button)

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when sign out clicked', async () => {
    const user = userEvent.setup()
    mockStore.profile = {
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://pic.url/photo.jpg',
    }

    render(<ProfileMenu />)

    await user.click(screen.getByRole('button', { name: /test user/i }))
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }))

    expect(mockSignOut).toHaveBeenCalled()
  })
})
