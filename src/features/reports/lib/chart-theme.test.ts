import { describe, it, expect } from 'vitest'
import { chartTheme } from './chart-theme'

describe('chartTheme', () => {
  it('exposes a colors array with at least 4 entries', () => {
    expect(Array.isArray(chartTheme.colors)).toBe(true)
    expect(chartTheme.colors.length).toBeGreaterThanOrEqual(4)
  })

  it('has transparent backgroundColor', () => {
    expect(chartTheme.backgroundColor).toBe('transparent')
  })

  it('has grid strokeDasharray defined', () => {
    expect(chartTheme.grid.strokeDasharray).toBeTruthy()
  })

  it('has tooltip config defined', () => {
    expect(chartTheme.tooltip.borderRadius).toBeTruthy()
  })
})
