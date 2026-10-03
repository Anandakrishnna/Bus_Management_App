import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { currentMonthKey, formatMonth, monthStart } from '../lib/month'
import { formatRupees } from '../lib/money'
import { getExpenseLabel } from '../lib/sheetDraft'
import { supabase } from '../lib/supabase'

type MonthlySummary = { total_collection: number; total_operating_expense: number; operating_balance: number; days_entered: number; mismatch_count: number }
type ExpenseTotal = { category: string; total_amount: number }

export function ReportsPage() {
  const [month, setMonth] = useState(currentMonthKey)
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [expenses, setExpenses] = useState<ExpenseTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadReport = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)
    const selectedMonth = monthStart(month)
    const [summaryResult, expensesResult] = await Promise.all([
      supabase.rpc('get_monthly_summary', { p_month: selectedMonth }),
      supabase.rpc('get_monthly_expense_breakdown', { p_month: selectedMonth }),
    ])
    setLoading(false)
    if (summaryResult.error || expensesResult.error) { setError(summaryResult.error?.message ?? expensesResult.error?.message ?? 'Could not load this report.'); return }
    setSummary((summaryResult.data?.[0] ?? { total_collection: 0, total_operating_expense: 0, operating_balance: 0, days_entered: 0, mismatch_count: 0 }) as MonthlySummary)
    setExpenses((expensesResult.data ?? []) as ExpenseTotal[])
  }, [month])
  useEffect(() => { void Promise.resolve().then(loadReport) }, [loadReport])
  return <section className="reports-page" aria-labelledby="report-title"><p className="eyebrow">Monthly report</p><div className="section-heading"><h1 id="report-title">{formatMonth(month)}</h1><Link to="/records">Records</Link></div><label className="month-input">Choose month<input aria-label="Choose report month" onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label>{loading && <p className="settings-help">Calculating your monthly report…</p>}{error && <><p className="form-feedback form-feedback--error" role="alert">{error}</p><button className="secondary-action" onClick={() => void loadReport()} type="button">Try again</button></>}{summary && !loading && !error && <><section className="report-balance"><span>Operating balance</span><strong>{formatRupees(summary.operating_balance)}</strong><small>{summary.days_entered} sheet{summary.days_entered === 1 ? '' : 's'} entered</small></section><dl className="report-totals"><div><dt>Total collection</dt><dd>{formatRupees(summary.total_collection)}</dd></div><div><dt>Total expense</dt><dd>{formatRupees(summary.total_operating_expense)}</dd></div><div><dt>Differences to check</dt><dd>{summary.mismatch_count}</dd></div></dl><section className="expense-breakdown"><h2>Expense breakdown</h2>{expenses.length === 0 ? <p className="settings-help">No operating expenses recorded for this month.</p> : expenses.map((expense) => <div key={expense.category}><span>{getExpenseLabel(expense.category)}</span><strong>{formatRupees(expense.total_amount)}</strong></div>)}</section></>}</section>
}
