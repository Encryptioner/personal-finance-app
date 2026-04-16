import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// A component that throws to trigger the error boundary
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render crash')
  return <div>Normal content</div>
}

// Suppress console.error for expected boundary errors
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeDefined()
  })

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText(/An unexpected error occurred/)).toBeDefined()
  })

  it('shows the error message in the fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Test render crash')).toBeDefined()
  })

  it('renders Reload button in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload/i })).toBeDefined()
  })

  it('renders Copy error details button in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /copy error details/i })).toBeDefined()
  })

  it('calls clipboard.writeText when Copy error details is clicked', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /copy error details/i }))
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('Test render crash'))
  })

  it('calls window.location.reload when Reload is clicked', () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
      configurable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadMock).toHaveBeenCalled()
  })
})
