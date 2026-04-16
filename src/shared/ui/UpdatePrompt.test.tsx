import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpdatePrompt } from './UpdatePrompt'

const mockUpdateApp = vi.fn()

vi.mock('@/sw-registration', () => ({
  useUpdatePrompt: vi.fn(),
}))

describe('UpdatePrompt', () => {
  it('renders nothing when needsUpdate is false', async () => {
    const { useUpdatePrompt } = await import('@/sw-registration')
    vi.mocked(useUpdatePrompt).mockReturnValue({ needsUpdate: false, updateApp: mockUpdateApp })

    const { container } = render(<UpdatePrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('renders update banner when needsUpdate is true', async () => {
    const { useUpdatePrompt } = await import('@/sw-registration')
    vi.mocked(useUpdatePrompt).mockReturnValue({ needsUpdate: true, updateApp: mockUpdateApp })

    render(<UpdatePrompt />)
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.getByText(/new version available/i)).toBeDefined()
  })

  it('renders reload button when update is available', async () => {
    const { useUpdatePrompt } = await import('@/sw-registration')
    vi.mocked(useUpdatePrompt).mockReturnValue({ needsUpdate: true, updateApp: mockUpdateApp })

    render(<UpdatePrompt />)
    expect(screen.getByRole('button', { name: /reload to update/i })).toBeDefined()
  })

  it('calls updateApp when reload button is clicked', async () => {
    const { useUpdatePrompt } = await import('@/sw-registration')
    vi.mocked(useUpdatePrompt).mockReturnValue({ needsUpdate: true, updateApp: mockUpdateApp })

    render(<UpdatePrompt />)
    fireEvent.click(screen.getByRole('button', { name: /reload to update/i }))
    expect(mockUpdateApp).toHaveBeenCalled()
  })
})
