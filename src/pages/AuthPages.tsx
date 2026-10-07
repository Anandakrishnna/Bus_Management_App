import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { strings } from '../strings'
import { AppLoading } from '../components/AppLoading'
import { validateOwnerContact } from '../lib/profile'

const pendingSignUpEmailKey = 'busledger-pending-signup-email'

type AuthFormProps = {
  title: string
  help: string
  children: ReactNode
}

function AuthForm({ title, help, children }: AuthFormProps) {
  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="wordmark wordmark--auth">{strings.appName}</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-help">{help}</p>
        {children}
      </section>
    </main>
  )
}

function AuthFeedback({ error, success }: { error: string | null; success: string | null }) {
  if (!error && !success) return null
  return <p className={error ? 'form-feedback form-feedback--error' : 'form-feedback'} role={error ? 'alert' : 'status'}>{error ?? success}</p>
}

export function LoginPage() {
  const { isLoading, signIn, user } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <AppLoading />
  if (user) return <Navigate replace to={location.state?.from ?? '/'} />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    const message = await signIn(email, password)
    setIsSubmitting(false)
    if (message) setError(message)
  }

  return (
    <AuthForm help="Sign in to your private one-bus ledger." title={strings.signIn}>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          <span>{strings.emailAddress}</span>
          <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label>
          <span>{strings.password}</span>
          <input autoComplete="current-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        <AuthFeedback error={error} success={null} />
        <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? strings.signInProgress : strings.signIn}</button>
      </form>
      <Link className="quiet-link" to="/forgot-password">{strings.forgotPassword}</Link>
      <Link className="quiet-link" to="/sign-up">{strings.createAccountPrompt}</Link>
      <Link className="quiet-link" to="/verify-email">Already have a verification code?</Link>
    </AuthForm>
  )
}

export function SignUpPage() {
  const { isLoading, signUp, user } = useAuth()
  const navigate = useNavigate()
  const [ownerName, setOwnerName] = useState('')
  const [vehicleName, setVehicleName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) return <AppLoading />
  if (user) return <Navigate replace to="/setup" />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (password.length < 8) {
      setError(strings.passwordLengthError)
      return
    }
    if (password !== confirmation) {
      setError(strings.passwordMatchError)
      return
    }
    const contactError = validateOwnerContact(ownerName, phoneNumber)
    if (contactError) { setError(contactError); return }
    if (!vehicleName.trim()) { setError('Enter the vehicle name.'); return }
    setIsSubmitting(true)
    try {
      const message = await signUp(email, password, { ownerName, phoneNumber, vehicleName })
      if (message) setError(message)
      else {
        sessionStorage.setItem(pendingSignUpEmailKey, email.trim())
        setSuccess(strings.accountCreated)
        navigate('/verify-email')
      }
    } finally { setIsSubmitting(false) }
  }

  return (
    <AuthForm help={strings.createAccountHelp} title={strings.createAccount}>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label><span>Owner name</span><input autoComplete="name" onChange={(event) => setOwnerName(event.target.value)} required value={ownerName} /></label>
        <label><span>Vehicle name</span><input autoComplete="organization" onChange={(event) => setVehicleName(event.target.value)} required value={vehicleName} /></label>
        <label><span>Phone number</span><input autoComplete="tel" inputMode="tel" onChange={(event) => setPhoneNumber(event.target.value)} required type="tel" value={phoneNumber} /></label>
        <label>
          <span>{strings.emailAddress}</span>
          <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <label>
          <span>{strings.password}</span>
          <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        <label>
          <span>{strings.confirmPassword}</span>
          <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
        </label>
        <AuthFeedback error={error} success={success} />
        <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? strings.createAccountProgress : strings.createAccount}</button>
      </form>
      <Link className="quiet-link" to="/login">You already have an account? Sign in</Link>
    </AuthForm>
  )
}

export function VerifyEmailPage() {
  const { isLoading, user, verifySignUpOtp, resendSignUpOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => sessionStorage.getItem(pendingSignUpEmailKey) ?? '')
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  if (isLoading) return <AppLoading />
  if (user) return <Navigate replace to="/setup" />

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null); setSuccess(null); setIsSubmitting(true)
    try {
      const message = await verifySignUpOtp(email, token)
      if (message) setError(message)
      else {
        sessionStorage.removeItem(pendingSignUpEmailKey)
        navigate('/setup', { replace: true })
      }
    } finally { setIsSubmitting(false) }
  }

  async function handleResend() {
    setError(null); setSuccess(null); setIsResending(true)
    try {
      const message = await resendSignUpOtp(email)
      if (message) setError(message)
      else setSuccess('A new verification code has been sent to your email.')
    } finally { setIsResending(false) }
  }

  return (
    <AuthForm help="Enter the six-digit code from the BusLedger confirmation email to verify your email address." title="Verify your email">
      <form className="auth-form" onSubmit={(event) => void handleVerify(event)}>
        <label><span>{strings.emailAddress}</span><input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label><span>Email verification code</span><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))} pattern="[0-9]{6}" required value={token} /></label>
        <AuthFeedback error={error} success={success} />
        <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? 'Verifying…' : 'Verify email'}</button>
      </form>
      <button className="text-button" disabled={isResending || !email} onClick={() => void handleResend()} type="button">{isResending ? 'Sending…' : 'Resend code'}</button>
      <Link className="quiet-link" to="/login">{strings.backToSignIn}</Link>
    </AuthForm>
  )
}

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)
    const message = await sendPasswordReset(email)
    setIsSubmitting(false)
    if (message) setError(message)
    else setSuccess(strings.resetLinkSent)
  }

  return (
    <AuthForm help={strings.resetPasswordHelp} title={strings.resetPassword}>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          <span>{strings.emailAddress}</span>
          <input autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        </label>
        <AuthFeedback error={error} success={success} />
        <button className="primary-action" disabled={isSubmitting} type="submit">{isSubmitting ? strings.sendingProgress : strings.sendResetLink}</button>
      </form>
      <Link className="quiet-link" to="/login">{strings.backToSignIn}</Link>
    </AuthForm>
  )
}

export function ResetPasswordPage() {
  const { updatePassword, user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (password.length < 8) {
      setError(strings.passwordLengthError)
      return
    }
    if (password !== confirmation) {
      setError(strings.passwordMatchError)
      return
    }
    setIsSubmitting(true)
    const message = await updatePassword(password)
    setIsSubmitting(false)
    if (message) setError(message)
    else setSuccess(strings.passwordUpdated)
  }

  return (
    <AuthForm help={user ? 'Choose a new password for your owner account.' : 'Open the password-reset link sent to your email, then return here.'} title={strings.resetPassword}>
      <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          <span>{strings.newPassword}</span>
          <input autoComplete="new-password" disabled={!user} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
        </label>
        <label>
          <span>{strings.confirmPassword}</span>
          <input autoComplete="new-password" disabled={!user} minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
        </label>
        <AuthFeedback error={error} success={success} />
        <button className="primary-action" disabled={!user || isSubmitting} type="submit">{isSubmitting ? strings.savingProgress : strings.savePassword}</button>
      </form>
      <Link className="quiet-link" to="/login">{strings.backToSignIn}</Link>
    </AuthForm>
  )
}
