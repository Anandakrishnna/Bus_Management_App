import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

export function MenuPage() {
  const { profile } = useBusProfile()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const displayName = profile?.name || profile?.registration_number || strings.appName

  async function handleSignOut() {
    const error = await signOut()
    if (!error) navigate('/login', { replace: true })
  }

  return (
    <section className="menu-page" aria-labelledby="menu-title">
      <p className="eyebrow">Owner menu</p>
      <h1 id="menu-title">{strings.menu}</h1>
      <p className="settings-help">{strings.menuHelp}</p>
      <div className="profile-summary">
        <span aria-hidden="true">◌</span>
        <div>
          <strong>{displayName}</strong>
          <p>{profile?.registration_number}</p>
        </div>
      </div>
      <div className="menu-list">
        <Link to="/settings"><span>{strings.settings}</span><span aria-hidden="true">›</span></Link>
        <Link to="/reports"><span>{strings.monthCalendar}</span><span aria-hidden="true">›</span></Link>
        <Link to="/help"><span>{strings.helpSupport}</span><span aria-hidden="true">›</span></Link>
      </div>
      <button className="danger-action" onClick={() => void handleSignOut()} type="button">{strings.signOut}</button>
    </section>
  )
}
