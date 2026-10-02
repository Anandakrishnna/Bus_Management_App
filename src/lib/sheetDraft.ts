import { standardExpenseCategories, type CollectionSheetDraft, type DraftExpense } from '../types/sheet'

const expenseLabels: Record<string, string> = {
  batha_driver: 'Batha — Driver', batha_conductor: 'Batha — Conductor', batha_checker: 'Batha — Checker', batha_cleaner: 'Batha — Cleaner',
  diesel: 'Diesel', oil_grease: 'Oil / Grease', tyre: 'Tyre', spare_parts: 'Spare parts', workshop: 'Workshop', stand_fee: 'Stand fee', washing: 'Washing', others: 'Others',
}

export function getExpenseLabel(category: DraftExpense['category']): string { return expenseLabels[category] }

export function createEmptyDraft(id: string, photoPath: string): CollectionSheetDraft {
  return {
    id, photoPath, sheetDate: new Date().toISOString().slice(0, 10), driverName: '', conductorName: '', checkerName: '', cleanerName: '',
    expenses: standardExpenseCategories.map((category) => ({ category, amount: null, note: '' })),
    collection: null, writtenTotal: null, writtenBalance: null, notes: '', needsReview: ['all values'],
  }
}

export function totalDraftExpenses(expenses: readonly DraftExpense[]): number {
  return expenses.reduce((total, expense) => total + (expense.amount ?? 0), 0)
}

export function validateDraft(draft: CollectionSheetDraft): string | null {
  if (!draft.sheetDate || draft.sheetDate > new Date().toISOString().slice(0, 10)) return 'Choose a sheet date that is not in the future.'
  if (draft.collection === null || !Number.isInteger(draft.collection) || draft.collection < 0) return 'Enter the collection as a whole number of rupees.'
  if (draft.expenses.some((expense) => expense.amount !== null && (!Number.isInteger(expense.amount) || expense.amount < 0))) return 'Expense values must be non-negative whole rupees.'
  return null
}
