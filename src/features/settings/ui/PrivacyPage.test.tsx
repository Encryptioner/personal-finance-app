import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrivacyPage } from './PrivacyPage'

// Mock react-router-dom Link
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}))

describe('PrivacyPage', () => {
  it('renders privacy policy title', () => {
    render(<PrivacyPage />)
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders last updated date', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })

  it('renders all key sections', () => {
    render(<PrivacyPage />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('What data is stored')).toBeInTheDocument()
    expect(screen.getByText('Google Drive sync')).toBeInTheDocument()
    expect(screen.getByText('What we don\'t do')).toBeInTheDocument()
    expect(screen.getByText('Your control')).toBeInTheDocument()
    expect(screen.getByText('Open source')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('mentions zero-backend architecture', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/zero-backend/i)).toBeInTheDocument()
  })

  it('mentions drive.appdata scope', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/drive\.appdata/i)).toBeInTheDocument()
  })

  it('has back to settings link', () => {
    render(<PrivacyPage />)
    expect(screen.getByText(/back to settings/i)).toBeInTheDocument()
  })

  it('has links to GitHub and Google account permissions', () => {
    render(<PrivacyPage />)

    const githubLink = screen.getByText(/github$/i).closest('a')
    expect(githubLink).toHaveAttribute('href', expect.stringContaining('github.com'))

    const permissionsLink = screen.getByText(/myaccount\.google\.com/i).closest('a')
    expect(permissionsLink).toHaveAttribute('href', expect.stringContaining('myaccount.google.com'))
  })
})
