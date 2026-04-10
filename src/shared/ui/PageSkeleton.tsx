/**
 * Simple skeleton loader for lazy-loaded pages.
 * Used as a Suspense fallback for code-split components.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header skeleton */}
      <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />

      {/* Stats grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
            <div className="h-6 w-24 animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="aspect-video animate-pulse rounded bg-slate-300 dark:bg-slate-600" />
      </div>
    </div>
  )
}
