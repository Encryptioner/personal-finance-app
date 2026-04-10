import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportWizard } from './ImportWizard'

// Mock the transaction store to avoid IndexedDB
vi.mock('../model/transaction-store', () => ({
  useTransactionStore: {
    getState: () => ({
      add: vi.fn().mockResolvedValue({ id: 'test-id' }),
    }),
  },
}))

const SAMPLE_CSV = `Date,Description,Amount,Category
2025-01-15,Coffee,4.50,Food & Dining
2025-01-16,Groceries,52.30,Groceries
2025-01-17,Salary,5000.00,Salary`

function createCsvFile(content: string): File {
  return new File([content], 'transactions.csv', { type: 'text/csv' })
}

describe('ImportWizard', () => {
  const onComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders upload step initially', () => {
    render(<ImportWizard onComplete={onComplete} />)
    expect(screen.getByText(/drop a csv file here/i)).toBeInTheDocument()
  })

  it('shows error for empty CSV', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile('Date,Description\n')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/no data rows/i)).toBeInTheDocument()
    })
  })

  it('advances to mapping step after valid file upload', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })
    // Should show Next button (mapping step)
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('shows preview table with data rows', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0)
  })

  it('auto-maps recognized columns', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })

    // Date, Amount, Category, Description should be auto-detected
    // The preview headers should show mapped field labels in parentheses
    expect(screen.getByText('(Date)')).toBeInTheDocument()
    expect(screen.getByText('(Amount)')).toBeInTheDocument()
  })

  it('advances to confirm step on Next', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/import summary/i)).toBeInTheDocument()
    })
    expect(screen.getByText('3')).toBeInTheDocument() // row count
  })

  it('imports transactions on confirm', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/import summary/i)).toBeInTheDocument()
    })

    const confirmBtn = screen.getByRole('button', { name: /import 3 transactions/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(screen.getByText(/imported/i)).toBeInTheDocument()
    })
  })

  it('returns to upload on Back from mapping', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /back/i }))

    await waitFor(() => {
      expect(screen.getByText(/drop a csv file here/i)).toBeInTheDocument()
    })
  })

  it('calls onComplete when Done is clicked after import', async () => {
    const user = userEvent.setup()
    render(<ImportWizard onComplete={onComplete} />)

    const file = createCsvFile(SAMPLE_CSV)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/map csv columns/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText(/import summary/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /import 3 transactions/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
