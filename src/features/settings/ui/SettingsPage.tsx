import { useEffect } from 'react'
import { useSettingsStore } from '@/features/settings/model/settings-store'
import { ThemeSection } from './ThemeSection'
import { LocaleSection } from './LocaleSection'
import { DataSection } from './DataSection'
import { AboutSection } from './AboutSection'
import { track } from '@/shared/lib/analytics-service'

export function SettingsPage() {
  const { isLoading, initialize } = useSettingsStore()

  useEffect(() => {
    void initialize()
  }, [initialize])

  useEffect(() => {
    track.navigatedToSettings()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your preferences and account</p>
        </div>

        <div className="divide-y space-y-8">
          <ThemeSection />
          <LocaleSection />
          <DataSection />
          <AboutSection />
        </div>
      </div>
    </div>
  )
}
