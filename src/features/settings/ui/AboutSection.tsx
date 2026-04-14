import { Link } from 'react-router-dom'

const APP_VERSION = '1.0.0'

export function AboutSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">About</h2>
      <div className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Personal Finance App</p>
          <p>Version {APP_VERSION}</p>
        </div>
        <p>
          Your data stays on your device and in your own Google Drive. No
          server, no tracking.
        </p>
        <div className="flex gap-4">
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <a
            href="https://github.com/Encryptioner/personal-finance-app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>
          <a
            href="https://github.com/Encryptioner/personal-finance-app/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            License
          </a>
        </div>
      </div>
    </div>
  )
}
