import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useBusProfile } from '../contexts/BusProfileContext'
import { strings } from '../strings'

type AppShellProps = {
  children: ReactNode
}

const navItems = [
  { to: '/', label: strings.home, icon: '⌂', end: true },
  { to: '/scan', label: strings.scan, icon: '+', primary: true },
  { to: '/records', label: strings.currentMonth, icon: '▤' },
  { to: '/menu', label: strings.menu, icon: '☰' },
]

export function AppShell({ children }: AppShellProps) {
  const { profile } = useBusProfile()

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="profile-button" to="/settings" aria-label="Open bus profile">
          <span aria-hidden="true">◌</span>
        </Link>
        <p className="wordmark">{strings.appName}</p>
        <span className="bus-shortcut" title={profile?.registration_number}>{profile?.registration_number}</span>
      </header>
      <main className="page-content">{children}</main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) => `nav-item${item.primary ? ' nav-item--primary' : ''}${isActive ? ' nav-item--active' : ''}`}
            end={item.end}
            key={item.to}
            to={item.to}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
