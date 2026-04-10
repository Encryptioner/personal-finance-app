import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { TransactionListPage } from '@/features/transactions/ui/TransactionListPage'
import { PageSkeleton } from '@/shared/ui/PageSkeleton'

// Lazy-load reports to code-split Recharts
const ReportsPage = lazy(() => import('@/features/reports').then((m) => ({ default: m.ReportsPage })))

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
      path: '*',
      element: <TransactionListPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
