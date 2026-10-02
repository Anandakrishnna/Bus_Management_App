import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { strings } from '../strings'
import { AppLoading } from '../components/AppLoading'

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
