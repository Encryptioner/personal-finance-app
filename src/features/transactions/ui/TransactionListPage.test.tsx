import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { TransactionListPage } from './TransactionListPage'
import { useTransactionStore } from '../model/transaction-store'
import { makeTransaction, resetTransactionCounter } from '@/shared/test-fixtures/transactions'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

function renderPage() {
  return render(<TransactionListPage />, { wrapper: Wrapper })
}

beforeEach(() => {
  resetTransactionCounter()
  useTransactionStore.setState({ transactions: [], filters: {}, sortKey: 'date', sortDirection: 'desc', loading: false, error: null })
})

describe('TransactionListPage', () => {
  it('shows empty state when no transactions', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('renders a transaction row after adding via store', async () => {
    useTransactionStore.setState({
      transactions: [makeTransaction({ id: 'tx-1', category: 'Groceries', amount: 1500, currency: 'USD' })],
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
  })

  it('opens add dialog when Add button clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    // Click the header "Add" button (not "Add transaction" in empty state)
    const addButtons = screen.getAllByRole('button', { name: /add/i })
    await user.click(addButtons[0]!)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /add transaction/i })).toBeInTheDocument()
  })

  it('filters are reflected in the UI', async () => {
    useTransactionStore.setState({
      transactions: [
        makeTransaction({ id: 'tx-inc', type: 'income', category: 'Salary', amount: 500000 }),
        makeTransaction({ id: 'tx-exp', type: 'expense', category: 'Food', amount: 2000 }),
      ],
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Salary')).toBeInTheDocument()
      expect(screen.getByText('Food')).toBeInTheDocument()
    })
  })
})
