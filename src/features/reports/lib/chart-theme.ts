/**
 * Recharts theme configuration that respects CSS variables.
 */
export const chartTheme = {
  colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
  backgroundColor: 'transparent',
  textColor: 'var(--color-text-primary)',
  grid: {
    strokeDasharray: '3 3',
    stroke: 'var(--color-border)',
  },
  tooltip: {
    backgroundColor: 'var(--color-background-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.375rem',
    color: 'var(--color-text-primary)',
  },
}
