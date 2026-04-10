import { useSettingsStore } from '@/features/settings/model/settings-store'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Theme } from '@/shared/types/settings'

export function ThemeSection() {
  const { settings, updateTheme } = useSettingsStore()

  const handleThemeChange = async (value: string) => {
    await updateTheme(value as Theme)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Theme</h2>
      <div className="space-y-2">
        <Label htmlFor="theme">Color scheme</Label>
        <Select value={settings.theme} onValueChange={handleThemeChange}>
          <SelectTrigger id="theme">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
