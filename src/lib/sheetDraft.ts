import { standardExpenseCategories, type CollectionSheetDraft, type DraftExpense } from '../types/sheet'

const expenseLabels: Record<string, string> = {
  batha_driver: 'Betta (wage) — Driver', batha_conductor: 'Betta (wage) — Conductor', batha_cleaner: 'Betta (wage) — Cleaner',
  diesel: 'Diesel', oil_grease: 'Oil / Grease', tyre: 'Tyre', spare_parts: 'Spare parts', workshop: 'Workshop', scan_fee: 'Scan fee', washing: 'Washing', others: 'Others',
}

export function getExpenseLabel(category: DraftExpense['category'] | string): string { return expenseLabels[category] ?? category.replace(/_/g, ' ') }

export function createEmptyDraft(id: string, photoPath: string): CollectionSheetDraft {
  return {
    id, photoPath, busRegistrationNumber: '', scannedBusRegistrationNumber: '', sheetDate: '', driverName: '', conductorName: '', cleanerName: '',
    expenses: standardExpenseCategories.map((category) => ({ category, amount: null, note: '' })),
    collection: null, writtenTotal: null, writtenBalance: null, notes: '', needsReview: [],
  }
}

export function totalDraftExpenses(expenses: readonly DraftExpense[]): number {
  return expenses.reduce((total, expense) => total + (expense.amount ?? 0), 0)
}

export function normalizeSheetDate(value: string, fallback: string): string {
  if (isValidSheetDate(value)) return value
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
  if (!match) return fallback
  const [, day, month, rawYear] = match
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  return isValidSheetDate(normalized) ? normalized : fallback
}

export function isValidSheetDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validateDraft(draft: CollectionSheetDraft): string | null {
  if (!isValidSheetDate(draft.sheetDate)) return 'Enter the date shown on the collection sheet.'
  if (draft.sheetDate > localDateString()) return 'Choose a sheet date that is not in the future.'
  if (!draft.driverName.trim()) return 'Enter or confirm the driver’s name from the sheet.'
  if (!draft.conductorName.trim()) return 'Enter or confirm the conductor’s name from the sheet.'
  if (!draft.cleanerName.trim()) return 'Enter or confirm the cleaner’s name from the sheet.'
  if (draft.collection === null || !Number.isInteger(draft.collection) || draft.collection < 0 || draft.collection > 2_147_483_647) return 'Enter the collection as a whole number of rupees.'
  if (draft.expenses.some((expense) => expense.amount !== null && (!Number.isInteger(expense.amount) || expense.amount < 0 || expense.amount > 2_147_483_647))) return 'Expense values must be non-negative whole rupees.'
  const expenseTotal = totalDraftExpenses(draft.expenses)
  if (expenseTotal > 2_147_483_647 || draft.collection - expenseTotal < -2_147_483_648) return 'The expense total is outside the supported whole-rupee range.'
  return null
}
