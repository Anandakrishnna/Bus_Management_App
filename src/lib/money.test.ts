import { describe, expect, it } from 'vitest'
import { formatRupees, getOperatingSummary, isNonNegativeWholeRupee } from './money'

describe('money helpers', () => {
  it('formats integer rupees using Indian grouping', () => {
    expect(formatRupees(1234567)).toBe('₹12,34,567')
  })

  it('calculates total operating expense and daily balance', () => {
    expect(
      getOperatingSummary(12370, [{ amount: 1240 }, { amount: 1120 }, { amount: 1000 }, { amount: 5350 }, { amount: 60 }, { amount: 100 }, { amount: 150 }]),
    ).toEqual({ totalOperatingExpense: 9020, dailyBalance: 3350 })
  })

  it('accepts only non-negative whole rupees', () => {
    expect(isNonNegativeWholeRupee(0)).toBe(true)
    expect(isNonNegativeWholeRupee(-1)).toBe(false)
    expect(isNonNegativeWholeRupee(12.5)).toBe(false)
  })
})
