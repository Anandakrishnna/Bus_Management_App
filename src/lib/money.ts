export type ExpenseAmount = Readonly<{ amount: number }>

export function formatRupees(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function isNonNegativeWholeRupee(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function getOperatingSummary(collection: number, expenses: readonly ExpenseAmount[]) {
  const totalOperatingExpense = expenses.reduce((total, expense) => total + expense.amount, 0)

  return {
    totalOperatingExpense,
    dailyBalance: collection - totalOperatingExpense,
  }
}
