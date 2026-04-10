import { useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { db } from '@/shared/db/db'
import { exportCsv } from '@/features/transactions/api/csv-exporter'
import { exportJson } from '@/features/transactions/api/json-exporter'
import { Button } from '@/components/ui/button'

export function DataSection() {
  const authStore = useAuthStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportJson = async () => {
    try {
      setIsExporting(true)
      const transactions = await db.transactions.toArray()
      const json = exportJson(transactions)
      downloadFile(json, 'transactions.json', 'application/json')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const transactions = await db.transactions.toArray()
      const csv = exportCsv(transactions)
      downloadFile(csv, 'transactions.csv', 'text/csv')
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleSignOut = async () => {
    await authStore.signOut()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Data & Account</h2>
      <div className="space-y-3">
        <div>
          <h3 className="mb-2 text-sm font-medium">Export</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExportJson()}
              disabled={isExporting}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleExportCsv()}
              disabled={isExporting}
            >
              Export CSV
            </Button>
          </div>
        </div>
        <div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleSignOut()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
