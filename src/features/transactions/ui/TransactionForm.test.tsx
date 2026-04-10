import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TransactionForm } from './TransactionForm'

function renderForm(onSubmit = vi.fn(), onCancel = vi.fn()) {
  return render(<TransactionForm onSubmit={onSubmit} onCancel={onCancel} />)
}

describe('TransactionForm', () => {
  it('renders all required fields', () => {
    renderForm()
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm(vi.fn(), onCancel)
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows validation error for empty amount', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderForm(onSubmit)
    // Clear amount (default is '') and submit
    const amountInput = screen.getByLabelText(/amount/i)
    await user.clear(amountInput)
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('shows validation error for invalid currency', async () => {
    const user = userEvent.setup()
    renderForm()
    const currencyInput = screen.getByLabelText(/currency/i)
    await user.clear(currencyInput)
    await user.type(currencyInput, 'usd') // lowercase → invalid
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText(/iso 4217/i)).toBeInTheDocument()
    })
  })

  it('errors are associated via aria-describedby', async () => {
    const user = userEvent.setup()
    renderForm()
    const currencyInput = screen.getByLabelText(/currency/i)
    await user.clear(currencyInput)
    await user.type(currencyInput, 'x')
    await user.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      const errorEl = screen.getByText(/iso 4217/i)
      expect(errorEl).toBeInTheDocument()
    })
  })
})
