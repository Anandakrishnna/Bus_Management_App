import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { monthStart, nextMonthStart } from '../lib/month'
import { formatRupees } from '../lib/money'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
type MonthlySummary = { total_collection: number; total_operating_expense: number; operating_balance: number; days_entered: number }
type RecentSheet = { id: string; sheet_date: string; collection: number; daily_balance: number }

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 17) return 'Good evening'
  if (hour >= 12) return 'Good afternoon'
  return strings.greeting
}

export function HomePage() {
  const { profile } = useBusProfile()
  const currentMonth = new Date().getMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const selectedMonthLabel = months[selectedMonth]
  const selectedYear = new Date().getFullYear()
  const selectedMonthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const [summary, setSummary] = useState<MonthlySummary>({ total_collection: 0, total_operating_expense: 0, operating_balance: 0, days_entered: 0 })
  const [recentSheets, setRecentSheets] = useState<RecentSheet[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0).getDate(), [selectedMonth, selectedYear])
  const loadMonth = useCallback(async () => {
    if (!supabase) return
    setLoadError(null)
    const [summaryResult, sheetsResult] = await Promise.all([
      supabase.rpc('get_monthly_summary', { p_month: monthStart(selectedMonthKey) }),
      supabase.from('sheet_summary').select('id, sheet_date, collection, daily_balance').gte('sheet_date', monthStart(selectedMonthKey)).lt('sheet_date', nextMonthStart(selectedMonthKey)).order('sheet_date', { ascending: false }).limit(3),
    ])
    if (summaryResult.error || sheetsResult.error) { setLoadError(summaryResult.error?.message ?? sheetsResult.error?.message ?? 'We could not load this month.'); return }
    setSummary((summaryResult.data?.[0] ?? { total_collection: 0, total_operating_expense: 0, operating_balance: 0, days_entered: 0 }) as MonthlySummary)
    setRecentSheets((sheetsResult.data ?? []) as RecentSheet[])
  }, [selectedMonthKey])
  useEffect(() => { void Promise.resolve().then(loadMonth) }, [loadMonth])

  return (
    <section className="home-page" aria-labelledby="home-title">
      {!isSupabaseConfigured && (
        <aside className="foundation-banner" aria-label="Configuration notice">
          <span aria-hidden="true">i</span>
          <p>{strings.foundationBanner}</p>
        </aside>
      )}

      <div className="greeting-row">
        <div>
          <p className="eyebrow">{strings.ownerLabel}</p>
          <h1 id="home-title">{getGreeting()}</h1>
          <p className="bus-name">{profile?.name || profile?.registration_number || strings.demoBus}</p>
        </div>
        <span className="month-pill">{selectedMonthLabel.slice(0, 3)} {selectedYear}</span>
      </div>

      <section className="today-status" aria-label="Today’s collection-sheet status">
        <div>
          <p>{strings.todayNotLogged}</p>
          <span>Start with a photo and check every value before saving.</span>
        </div>
        <Link className="text-action" to="/scan">{strings.scan}</Link>
      </section>

      <section className="summary-card" aria-label={`${selectedMonthLabel} operating balance`}>
        <p>{strings.operatingBalance}</p>
        <strong>{formatRupees(summary.operating_balance)}</strong>
        <span>{selectedMonthLabel} {selectedYear}</span>
      </section>

      <dl className="supporting-totals">
        <div>
          <dt>{strings.totalCollection}</dt>
          <dd>{formatRupees(summary.total_collection)}</dd>
        </div>
        <div>
          <dt>{strings.totalExpense}</dt>
          <dd>{formatRupees(summary.total_operating_expense)}</dd>
        </div>
        <div>
          <dt>{strings.daysEntered}</dt>
          <dd>{summary.days_entered} / {daysInMonth}</dd>
        </div>
      </dl>

      <section className="month-selector" aria-label="Select report month">
        <div className="section-heading">
          <h2>Select month</h2>
          <Link to="/reports">{strings.reports}</Link>
        </div>
        <div className="month-grid">
          {months.map((month, index) => (
            <button
              aria-pressed={index === selectedMonth}
              className={index === selectedMonth ? 'month-button month-button--selected' : 'month-button'}
              key={month}
              onClick={() => setSelectedMonth(index)}
              type="button"
            >
              {month.slice(0, 3)}
            </button>
          ))}
        </div>
      </section>

      <Link className="primary-action" to="/scan">
        <span aria-hidden="true">＋</span>
        {strings.scanSheet}
      </Link>

      <section className="empty-state" aria-labelledby="recent-sheets-title">
        <div className="section-heading">
          <h2 id="recent-sheets-title">{strings.recentSheets}</h2>
          <Link to="/records">View all</Link>
        </div>
        {loadError && <p className="form-feedback form-feedback--error" role="alert">{loadError}</p>}
        {!loadError && recentSheets.length === 0 && <div className="empty-state__body">
          <span className="empty-icon" aria-hidden="true">▤</span>
          <div>
            <p>{strings.noSheets}</p>
            <span>{strings.noSheetsHelp}</span>
          </div>
        </div>}
        {!loadError && recentSheets.map((sheet) => <Link className="home-record-row" key={sheet.id} to={`/sheets/${sheet.id}`}><strong>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${sheet.sheet_date}T00:00:00`))}</strong><span>Collection {formatRupees(sheet.collection)} · Balance {formatRupees(sheet.daily_balance)}</span></Link>)}
      </section>
    </section>
  )
}
