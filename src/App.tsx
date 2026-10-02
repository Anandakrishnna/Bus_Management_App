import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ConfiguredOnly, ProfileRequired, SignedInOnly, SetupOnly } from './components/AccessGate'
import { AuthProvider } from './contexts/AuthContext'
import { BusProfileProvider } from './contexts/BusProfileContext'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from './pages/AuthPages'
import { HomePage } from './pages/HomePage'
import { MenuPage } from './pages/MenuPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { ScanPage } from './pages/ScanPage'
import { ReviewPage } from './pages/ReviewPage'

function ProtectedShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BusProfileProvider>
        <Routes>
          <Route element={<ConfiguredOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<SignedInOnly />}>
              <Route element={<SetupOnly />}>
                <Route path="/setup" element={<SetupPage />} />
              </Route>
              <Route element={<ProfileRequired />}>
                <Route element={<ProtectedShell />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/review/:step" element={<ReviewPage />} />
                  <Route path="/records" element={<PlaceholderPage />} />
                  <Route path="/reports" element={<PlaceholderPage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<PlaceholderPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BusProfileProvider>
    </AuthProvider>
  )
}
