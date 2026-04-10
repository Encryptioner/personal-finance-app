import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { TransactionListPage } from '@/features/transactions/ui/TransactionListPage'
import { PageSkeleton } from '@/shared/ui/PageSkeleton'

// Lazy-load reports and settings to code-split
const ReportsPage = lazy(() => import('@/features/reports').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings').then((m) => ({ default: m.SettingsPage })))

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <TransactionListPage />,
    },
    {
      path: '/reports',
      element: (
        <Suspense fallback={<PageSkeleton />}>
          <ReportsPage />
        </Suspense>
      ),
    },
    {
      path: '/settings',
      element: (
        <Suspense fallback={<PageSkeleton />}>
          <SettingsPage />
        </Suspense>
      ),
    },
    {
      path: '*',
      element: <TransactionListPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
