export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthStart(month: string): string {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? `${month}-01` : `${currentMonthKey()}-01`
}

export function nextMonthStart(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const next = new Date(Date.UTC(year, monthNumber, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(`${monthStart(month)}T00:00:00`))
}
