import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataSection } from './DataSection'

// Mock auth store — component calls useAuthStore() without selector
const mockStore = {
  status: 'idle' as string,
  signOut: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/features/auth', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: typeof mockStore) => unknown) =>
      selector ? selector(mockStore) : mockStore,
    { getState: () => mockStore },
  ),
}))

// Mock database
vi.mock('@/shared/db/db', () => ({
  db: {
    transactions: {
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}))

// Mock exporters
vi.mock('@/features/transactions/api/csv-exporter', () => ({
  exportCsv: vi.fn().mockReturnValue('csv data'),
}))

vi.mock('@/features/transactions/api/json-exporter', () => ({
  exportJson: vi.fn().mockReturnValue('json data'),
}))

// Mock react-router-dom Link
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

describe('DataSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.status = 'idle'
  })

  it('shows local storage message when not authenticated', () => {
    render(<DataSection />)
    expect(screen.getByText(/stored locally on this device/i)).toBeInTheDocument()
  })

  it('shows sync message when authenticated', () => {
    mockStore.status = 'authenticated'
    render(<DataSection />)
    expect(screen.getByText(/synced to your google drive/i)).toBeInTheDocument()
  })

  it('hides sign-out button when not authenticated', () => {
    render(<DataSection />)
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
  })

  it('shows sign-out button when authenticated', () => {
    mockStore.status = 'authenticated'
    render(<DataSection />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when sign-out clicked', async () => {
    const user = userEvent.setup()
    mockStore.status = 'authenticated'
    render(<DataSection />)

    await user.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mockStore.signOut).toHaveBeenCalled()
  })

  it('has privacy policy link', () => {
    render(<DataSection />)
    expect(screen.getByText(/privacy policy/i)).toBeInTheDocument()
  })

  it('shows export buttons', () => {
    render(<DataSection />)
    expect(screen.getByRole('button', { name: /export json/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
  })
})
