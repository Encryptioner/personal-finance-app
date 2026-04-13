import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { initAnalytics, trackPageView } from '@/shared/lib/analytics'
import { track } from '@/shared/lib/analytics-service'
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary'

export default function App() {
  useEffect(() => {
    // Initialize Google Analytics
    initAnalytics()

    // Track initial page view
    trackPageView(window.location.pathname)

    // Track navigation changes
    const handleRouteChange = () => {
      trackPageView(window.location.pathname)
    }

    // Listen for navigation changes
    window.addEventListener('popstate', handleRouteChange)

    // Check if app was installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator && navigator.standalone)) {
      track.appOpened()
    }

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
