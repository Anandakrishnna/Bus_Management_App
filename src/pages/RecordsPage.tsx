import { useCallback, useEffect, useState } from 'react'
import { formatRupees } from '../lib/money'
import { supabase } from '../lib/supabase'

type SheetSummary = { id: string; sheet_date: string; collection: number; total_operating_expense: number; daily_balance: number; total_mismatch: boolean; balance_mismatch: boolean }

const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date())

export function RecordsPage() {
  const [sheets, setSheets] = useState<SheetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadSheets = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10)
    const { data, error: requestError } = await supabase.from('sheet_summary').select('id, sheet_date, collection, total_operating_expense, daily_balance, total_mismatch, balance_mismatch').gte('sheet_date', start).lt('sheet_date', end).order('sheet_date', { ascending: false })
    setLoading(false)
    if (requestError) { setError(requestError.message); return }
    setSheets((data ?? []) as SheetSummary[])
  }, [])
  useEffect(() => { void Promise.resolve().then(loadSheets) }, [loadSheets])
  return <section className="records-page" aria-labelledby="records-title"><p className="eyebrow">Saved sheets</p><h1 id="records-title">{monthLabel} records</h1>{loading && <p className="settings-help">Loading verified sheets…</p>}{error && <><p className="form-feedback form-feedback--error" role="alert">We could not load your records. {error}</p><button className="secondary-action" onClick={() => void loadSheets()} type="button">Try again</button></>}{!loading && !error && sheets.length === 0 && <div className="empty-state__body"><span className="empty-icon" aria-hidden="true">▤</span><div><p>No sheets saved for this month</p><span>Scan a collection sheet to begin your ledger.</span></div></div>}{sheets.map((sheet) => <article className="record-row" key={sheet.id}><div><strong>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${sheet.sheet_date}T00:00:00`))}</strong>{(sheet.total_mismatch || sheet.balance_mismatch) && <small>Needs review</small>}</div><dl><div><dt>Collection</dt><dd>{formatRupees(sheet.collection)}</dd></div><div><dt>Expense</dt><dd>{formatRupees(sheet.total_operating_expense)}</dd></div><div><dt>Balance</dt><dd>{formatRupees(sheet.daily_balance)}</dd></div></dl></article>)}</section>
}
