import { describe, expect, it } from 'vitest'
import { monthStart, nextMonthStart } from './month'

describe('month helpers', () => {
  it('uses calendar month boundaries without timezone shifts', () => {
    expect(monthStart('2026-07')).toBe('2026-07-01')
    expect(nextMonthStart('2026-12')).toBe('2027-01-01')
  })
})
