import { Link, useLocation } from 'react-router-dom'
import { strings } from '../strings'

const pageContent: Record<string, { title: string; body: string }> = {
  '/scan': { title: 'Scan collection sheet', body: 'Camera and gallery intake will be added in Phase 3. You will review every extracted value before anything is saved.' },
  '/records': { title: 'Current-month records', body: 'Verified sheet history and detail views will be added in Phase 4.' },
  '/reports': { title: 'Monthly report', body: 'Database-backed totals, calendar, and charts will be added in Phase 5.' },
  '/menu': { title: 'Menu', body: 'Bus profile settings, calendar, help, and sign out will be added after authentication in Phase 2.' },
  '/help': { title: 'Help & support', body: 'Support contact details will be added before release.' },
}

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const content = pageContent[pathname] ?? pageContent['/menu']

  return (
    <section className="placeholder-page" aria-labelledby="placeholder-title">
      <span className="placeholder-icon" aria-hidden="true">⌁</span>
      <p className="eyebrow">BusLedger foundation</p>
      <h1 id="placeholder-title">{content.title}</h1>
      <p>{content.body}</p>
      <Link className="primary-action" to="/">Return home</Link>
      <p className="configuration-note">{strings.configurationNeeded}</p>
    </section>
  )
}
