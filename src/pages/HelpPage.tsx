import { Link } from 'react-router-dom'

export function HelpPage() {
  return (
    <section className="help-page" aria-labelledby="help-title">
      <p className="eyebrow">Support & privacy</p>
      <h1 id="help-title">Use BusLedger with confidence</h1>
      <section className="detail-section">
        <h2>Daily workflow</h2>
        <p>Photograph the collection sheet, check every extracted value, and save it only when it is correct.</p>
      </section>
      <section className="detail-section">
        <h2>Your data</h2>
        <p>Your signed-in owner account can access its bus profile, saved sheets, reports, and private sheet photos. Review images before saving because the owner remains responsible for the final figures.</p>
      </section>
      <section className="detail-section">
        <h2>Need help?</h2>
        <p>Contact your BusLedger administrator for account, billing, or report questions. Keep your password private and use the reset link if you cannot sign in.</p>
      </section>
      <Link className="primary-action" to="/reports">Open monthly report</Link>
    </section>
  )
}
