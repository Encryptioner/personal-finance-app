import { createBrowserRouter } from 'react-router-dom'
import { TransactionListPage } from '@/features/transactions/ui/TransactionListPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <TransactionListPage />,
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
