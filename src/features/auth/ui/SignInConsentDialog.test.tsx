import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInConsentDialog } from './SignInConsentDialog'

describe('SignInConsentDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders consent content when open', () => {
    render(
      <SignInConsentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    expect(screen.getByText(/before you sign in/i)).toBeInTheDocument()
    expect(screen.getByText(/hidden app folder/i)).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(
      <SignInConsentDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    expect(screen.queryByText(/before you sign in/i)).not.toBeInTheDocument()
  })

  it('shows unverified app steps', () => {
    render(
      <SignInConsentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    expect(screen.getByText(/click advanced/i)).toBeInTheDocument()
    expect(screen.getByText(/go to personal finance app/i)).toBeInTheDocument()
  })

  it('shows data ownership message', () => {
    render(
      <SignInConsentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    expect(screen.getByText(/exclusively in your google drive/i)).toBeInTheDocument()
  })

  it('calls onOpenChange(false) and onConfirm when continue clicked', async () => {
    const user = userEvent.setup()
    render(
      <SignInConsentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: /i understand/i }))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnConfirm).toHaveBeenCalled()
  })

  it('calls onOpenChange(false) when cancel clicked without calling onConfirm', async () => {
    const user = userEvent.setup()
    render(
      <SignInConsentDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onConfirm={mockOnConfirm}
      />,
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })
})
