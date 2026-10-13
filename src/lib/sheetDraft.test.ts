import { describe, expect, it } from 'vitest'
import { createEmptyDraft, getExpenseLabel, normalizeSheetDate, totalDraftExpenses, validateDraft } from './sheetDraft'

describe('collection-sheet drafts', () => {
  it('creates an editable draft with every standard expense row', () => {
    const draft = createEmptyDraft('sheet-id', 'owner-id/sheet-id.jpg')
    expect(draft.expenses).toHaveLength(10)
    expect(draft).not.toHaveProperty('checkerName')
    expect(getExpenseLabel('batha_driver')).toBe('Betta (wage) — Driver')
    expect(draft.collection).toBeNull()
  })

  it('calculates preview totals while treating blank values as zero', () => {
    expect(totalDraftExpenses([{ category: 'diesel', amount: 5350, note: '' }, { category: 'others', amount: null, note: '' }])).toBe(5350)
  })

  it('normalizes paper-style OCR dates for the database', () => {
    expect(normalizeSheetDate('18/07/2026', '2026-10-03')).toBe('2026-07-18')
    expect(normalizeSheetDate('2026-07-18', '2026-10-03')).toBe('2026-07-18')
  })

  it('requires a non-future date and whole-rupee collection before saving', () => {
    const draft = createEmptyDraft('sheet-id', 'owner-id/sheet-id.jpg')
    const complete = { ...draft, driverName: 'Driver', conductorName: 'Conductor', cleanerName: 'Cleaner', collection: 12000, sheetDate: '2026-07-18' }
    expect(validateDraft(draft)).toBe('Enter the date shown on the collection sheet.')
    expect(validateDraft({ ...complete, sheetDate: '2999-01-01' })).toBe('Choose a sheet date that is not in the future.')
    expect(validateDraft(complete)).toBeNull()
  })
})
