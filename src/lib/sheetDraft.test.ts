import { describe, expect, it } from 'vitest'
import { createEmptyDraft, totalDraftExpenses, validateDraft } from './sheetDraft'

describe('collection-sheet drafts', () => {
  it('creates an editable draft with every standard expense row', () => {
    const draft = createEmptyDraft('sheet-id', 'owner-id/sheet-id.jpg')
    expect(draft.expenses).toHaveLength(11)
    expect(draft.collection).toBeNull()
  })

  it('calculates preview totals while treating blank values as zero', () => {
    expect(totalDraftExpenses([{ category: 'diesel', amount: 5350, note: '' }, { category: 'others', amount: null, note: '' }])).toBe(5350)
  })

  it('requires a non-future date and whole-rupee collection before saving', () => {
    const draft = createEmptyDraft('sheet-id', 'owner-id/sheet-id.jpg')
    expect(validateDraft(draft)).toBe('Enter the collection as a whole number of rupees.')
    expect(validateDraft({ ...draft, collection: 12000, sheetDate: '2999-01-01' })).toBe('Choose a sheet date that is not in the future.')
    expect(validateDraft({ ...draft, collection: 12000 })).toBeNull()
  })
})
