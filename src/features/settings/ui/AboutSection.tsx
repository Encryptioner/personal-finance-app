import { Link } from 'react-router-dom'
import { useSettingsStore } from '@/features/settings/model/settings-store'

const APP_VERSION = '1.0.0'

export function AboutSection() {
  const { settings, updateAnalyticsEnabled } = useSettingsStore()

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

      <div className="border-t pt-4 space-y-2">
        <h3 className="text-sm font-medium text-foreground">Diagnostics</h3>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={settings.analyticsEnabled}
            onChange={(e) => void updateAnalyticsEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer"
            aria-describedby="analytics-hint"
          />
          <span className="space-y-0.5">
            <span className="text-sm text-foreground group-hover:text-foreground/80">
              Help improve the app
            </span>
            <span
              id="analytics-hint"
              className="block text-xs text-muted-foreground"
            >
              Sends anonymous feature-usage events (e.g. "transaction added",
              "sync completed"). No personal data, no financial amounts, no
              identifiers are ever sent.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}
