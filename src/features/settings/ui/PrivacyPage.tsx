import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const LAST_UPDATED = 'April 13, 2026'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <p>
              Personal Finance App is a zero-backend application. There is no
              server, no database controlled by the developer, and no
              third-party analytics. Your financial data stays on your device
              and, if you choose to sign in, in your own Google Drive.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              What data is stored
            </h2>
            <p>
              The app stores the transaction data you enter — amounts, dates,
              categories, descriptions, and tags. This data lives in your
              browser's local storage (IndexedDB) and is never sent to any
              server controlled by the developer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Google Drive sync
            </h2>
            <p>
              If you sign in with Google, your data syncs to a hidden app folder
              in <strong>your</strong> Google Drive. This folder is not visible
              in your normal Drive view, and the developer cannot access it. The
              app only requests the{' '}
              <code className="bg-muted px-1 rounded text-xs">
                drive.appdata
              </code>{' '}
              scope — it cannot see, read, or modify any of your personal files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              What we don't do
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>No tracking or analytics that identify you personally</li>
              <li>No ads or ad networks</li>
              <li>No selling or sharing data with third parties</li>
              <li>No backend server collecting your information</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Your control
            </h2>
            <p>
              You can export all your data at any time from Settings (JSON or
              CSV). You can delete all local data by clearing your browser data.
              If synced, you can remove the app's data from your Google Drive
              account settings at{' '}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                myaccount.google.com/permissions
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              Open source
            </h2>
            <p>
              The full source code is publicly available on{' '}
              <a
                href="https://github.com/Encryptioner/personal-finance-app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub
              </a>
              . You can inspect exactly what the app does with your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p>
              Questions or concerns about privacy? Open an issue on the{' '}
              <a
                href="https://github.com/Encryptioner/personal-finance-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
