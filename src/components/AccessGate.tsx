import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'
import { AppLoading } from './AppLoading'

export function ConfiguredOnly() {
  const { configured } = useAuth()
  return configured ? <Outlet /> : <ConfigurationRequired />
}

export function SignedInOnly() {
  const { isLoading, user } = useAuth()
  const location = useLocation()
  if (isLoading) return <AppLoading />
  if (!user) return <Navigate replace state={{ from: location.pathname }} to="/login" />
  return <Outlet />
}

export function ProfileRequired() {
  const { profile, status } = useBusProfile()
  if (status === 'idle' || status === 'loading') return <AppLoading />
  if (status === 'error') return <ProfileLoadError />
  if (!profile) return <Navigate replace to="/setup" />
  return <Outlet />
}

export function SetupOnly() {
  const { profile, status } = useBusProfile()
  if (status === 'idle' || status === 'loading') return <AppLoading />
  if (status === 'error') return <ProfileLoadError />
  if (profile) return <Navigate replace to="/" />
  return <Outlet />
}

function ProfileLoadError() {
  const { error, refreshProfile } = useBusProfile()
  return (
    <main className="configuration-page" aria-live="polite">
      <span className="placeholder-icon" aria-hidden="true">!</span>
      <h1>{strings.profileLoadErrorTitle}</h1>
      <p>{error ?? strings.profileLoadErrorHelp}</p>
      <button className="primary-action" onClick={() => void refreshProfile()} type="button">{strings.retry}</button>
    </main>
  )
}

function ConfigurationRequired() {
  return (
    <main className="configuration-page">
      <span className="placeholder-icon" aria-hidden="true">i</span>
      <p className="eyebrow">BusLedger setup</p>
      <h1>{strings.configurationTitle}</h1>
      <p>{strings.configurationHelp}</p>
    </main>
  )
}
