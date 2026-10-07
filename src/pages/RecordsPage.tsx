import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { currentMonthKey, formatMonth, monthStart, nextMonthStart } from '../lib/month'
import { formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'

type SheetSummary = { id: string; sheet_date: string; collection: number; total_operating_expense: number; daily_balance: number; total_mismatch: boolean; balance_mismatch: boolean }

export function RecordsPage() {
  const [month, setMonth] = useState(currentMonthKey)
  const [sheets, setSheets] = useState<SheetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSheets = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)
    const start = monthStart(month)
    try {
      const { data, error: requestError } = await supabase.from('sheet_summary').select('id, sheet_date, collection, total_operating_expense, daily_balance, total_mismatch, balance_mismatch').gte('sheet_date', start).lt('sheet_date', nextMonthStart(month)).order('sheet_date', { ascending: false })
      if (requestError) { setError(requestError.message); return }
      setSheets((data ?? []) as SheetSummary[])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load records. Check your connection and try again.')
    } finally { setLoading(false) }
  }, [month])
  useEffect(() => { void Promise.resolve().then(loadSheets) }, [loadSheets])
  const totals = useMemo(() => sheets.reduce((summary, sheet) => ({ collection: summary.collection + sheet.collection, expense: summary.expense + sheet.total_operating_expense, balance: summary.balance + sheet.daily_balance }), { collection: 0, expense: 0, balance: 0 }), [sheets])
  return <section className="records-page" aria-labelledby="records-title"><p className="eyebrow">Saved sheets</p><div className="section-heading"><h1 id="records-title">{formatMonth(month)}</h1><Link to="/reports">Report</Link></div><label className="month-input">Choose month<input aria-label="Choose record month" onChange={(event) => setMonth(event.target.value)} type="month" value={month} /></label>{!loading && !error && <dl className="record-totals"><div><dt>Collection</dt><dd>{formatRupees(totals.collection)}</dd></div><div><dt>Expense</dt><dd>{formatRupees(totals.expense)}</dd></div><div><dt>Balance</dt><dd>{formatRupees(totals.balance)}</dd></div></dl>}{loading && <p className="settings-help">Loading verified sheets…</p>}{error && <><p className="form-feedback form-feedback--error" role="alert">We could not load your records. {error}</p><button className="secondary-action" onClick={() => void loadSheets()} type="button">Try again</button></>}{!loading && !error && sheets.length === 0 && <div className="empty-state__body"><span className="empty-icon" aria-hidden="true">▤</span><div><p>No sheets saved for this month</p><span>Choose another month or scan a collection sheet.</span></div></div>}{sheets.map((sheet) => <Link className="record-row" key={sheet.id} to={`/sheets/${sheet.id}`}><div><strong>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${sheet.sheet_date}T00:00:00`))}</strong>{(sheet.total_mismatch || sheet.balance_mismatch) && <small>Needs review</small>}</div><dl><div><dt>Collection</dt><dd>{formatRupees(sheet.collection)}</dd></div><div><dt>Expense</dt><dd>{formatRupees(sheet.total_operating_expense)}</dd></div><div><dt>Balance</dt><dd>{formatRupees(sheet.daily_balance)}</dd></div></dl></Link>)}</section>
}
