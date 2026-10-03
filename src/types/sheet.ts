export const standardExpenseCategories = [
  'batha_driver', 'batha_conductor', 'batha_cleaner', 'diesel',
  'oil_grease', 'tyre', 'spare_parts', 'workshop', 'stand_fee', 'washing',
] as const

export type StandardExpenseCategory = (typeof standardExpenseCategories)[number]
export type ExpenseCategory = StandardExpenseCategory | 'others'

export type DraftExpense = { category: ExpenseCategory; amount: number | null; note: string }

export type CollectionSheetDraft = {
  id: string
  photoPath: string
  sheetDate: string
  driverName: string
  conductorName: string
  cleanerName: string
  expenses: DraftExpense[]
  collection: number | null
  writtenTotal: number | null
  writtenBalance: number | null
  notes: string
  needsReview: string[]
}
