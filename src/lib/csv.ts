export type MonthlyCsvSummary = {
  totalCollection: number
  totalExpense: number
  operatingBalance: number
  daysEntered: number
  mismatchesToCheck: number
}

export type MonthlyCsvSheet = {
  date: string
  collection: number
  expense: number
  balance: number
  needsReview: boolean
}

export type MonthlyCsvExpense = {
  category: string
  amount: number
}

function escapeCsvValue(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function row(values: Array<string | number | boolean>): string {
  return values.map(escapeCsvValue).join(',')
}

export function createMonthlyReportCsv(input: {
  month: string
  summary: MonthlyCsvSummary
  sheets: MonthlyCsvSheet[]
  expenses: MonthlyCsvExpense[]
}): string {
  const { expenses, month, sheets, summary } = input
  const rows: string[] = [
    row(['BusLedger monthly report', month]),
    '',
    row(['Summary', 'Amount (INR)']),
    row(['Total collection', summary.totalCollection]),
    row(['Total operating expense', summary.totalExpense]),
    row(['Operating balance', summary.operatingBalance]),
    row(['Days entered', summary.daysEntered]),
    row(['Differences to check', summary.mismatchesToCheck]),
    '',
    row(['Daily sheets']),
    row(['Date', 'Collection (INR)', 'Expense (INR)', 'Balance (INR)', 'Needs review']),
    ...sheets.map((sheet) => row([sheet.date, sheet.collection, sheet.expense, sheet.balance, sheet.needsReview ? 'Yes' : 'No'])),
    '',
    row(['Expense breakdown']),
    row(['Category', 'Amount (INR)']),
    ...expenses.map((expense) => row([expense.category, expense.amount])),
  ]

  return `\uFEFF${rows.join('\r\n')}\r\n`
}
