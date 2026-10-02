import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRupees } from '../lib/money'
import { isSupabaseConfigured } from '../lib/supabase'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

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
  const monthBalance = 0
  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth + 1, 0).getDate(), [selectedMonth, selectedYear])

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
        <strong>{formatRupees(monthBalance)}</strong>
        <span>{selectedMonthLabel} {selectedYear}</span>
      </section>

      <dl className="supporting-totals">
        <div>
          <dt>{strings.totalCollection}</dt>
          <dd>{formatRupees(0)}</dd>
        </div>
        <div>
          <dt>{strings.totalExpense}</dt>
          <dd>{formatRupees(0)}</dd>
        </div>
        <div>
          <dt>{strings.daysEntered}</dt>
          <dd>0 / {daysInMonth}</dd>
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
        <div className="empty-state__body">
          <span className="empty-icon" aria-hidden="true">▤</span>
          <div>
            <p>{strings.noSheets}</p>
            <span>{strings.noSheetsHelp}</span>
          </div>
        </div>
      </section>
    </section>
  )
}
