import { describe, expect, it } from 'vitest'
import { createMonthlyReportCsv } from './csv'

describe('createMonthlyReportCsv', () => {
  it('creates an Excel-compatible report with safely escaped values', () => {
    const csv = createMonthlyReportCsv({
      month: 'October 2026',
      summary: { totalCollection: 13090, totalExpense: 9507, operatingBalance: 3583, daysEntered: 1, mismatchesToCheck: 0 },
      sheets: [{ date: '2026-10-02', collection: 13090, expense: 9507, balance: 3583, needsReview: false }],
      expenses: [{ category: 'Other, parking', amount: 100 }],
    })

    expect(csv).toContain('BusLedger monthly report,October 2026')
    expect(csv).toContain('2026-10-02,13090,9507,3583,No')
    expect(csv).toContain('"Other, parking",100')
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })
})
