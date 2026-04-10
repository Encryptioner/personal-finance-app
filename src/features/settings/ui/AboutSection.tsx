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
          A zero-backend personal finance tracker that syncs to your Google Drive.
          Your data is yours — encrypted and stored in your own cloud.
        </p>
        <div className="flex gap-4">
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
