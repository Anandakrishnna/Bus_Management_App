import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ConfiguredOnly, ProfileRequired, SignedInOnly, SetupOnly } from './components/AccessGate'
import { AuthProvider } from './contexts/AuthContext'
import { BusProfileProvider } from './contexts/BusProfileContext'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignUpPage } from './pages/AuthPages'
import { HomePage } from './pages/HomePage'
import { MenuPage } from './pages/MenuPage'
import { HelpPage } from './pages/HelpPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetupPage } from './pages/SetupPage'
import { ScanPage } from './pages/ScanPage'
import { ReviewPage } from './pages/ReviewPage'
import { RecordsPage } from './pages/RecordsPage'
import { SheetDetailPage } from './pages/SheetDetailPage'
import { ReportsPage } from './pages/ReportsPage'

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
            <Route path="/sign-up" element={<SignUpPage />} />
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
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/sheets/:id" element={<SheetDetailPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<HelpPage />} />
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
