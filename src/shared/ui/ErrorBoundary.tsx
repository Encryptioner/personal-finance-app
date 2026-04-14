import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Global error boundary.
 * Catches render crashes and shows a recoverable fallback UI.
 * Per spec §9.5: no external telemetry — offers "Copy error details" for bug reports.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. Try reloading the page.
          </p>
          {this.state.error && (
            <pre className="text-left text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={this.handleCopy}
              className="text-sm font-medium px-4 py-2 rounded border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
            >
              Copy error details
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm font-medium px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }

  private handleCopy = () => {
    const details = `Error at ${new Date().toISOString()}:\n${this.state.error?.stack ?? this.state.error?.message ?? 'Unknown error'}`
    void navigator.clipboard.writeText(details)
  }
}
