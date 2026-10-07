import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthContextValue = {
  configured: boolean
  isLoading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, profile: SignUpProfile) => Promise<string | null>
  verifySignUpOtp: (email: string, token: string) => Promise<string | null>
  resendSignUpOtp: (email: string) => Promise<string | null>
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getResetRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/reset-password`
}

export type SignUpProfile = { ownerName: string; phoneNumber: string; vehicleName: string }

function getSignUpRedirectUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return

    let isMounted = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) setSession(null)
      else setSession(data.session)
    }).catch(() => {
      if (isMounted) setSession(null)
    }).finally(() => {
      if (isMounted) setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    isLoading,
    session,
    user: session?.user ?? null,
    async signIn(email, password) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        return error?.message ?? null
      } catch { return 'Could not sign in. Check your connection and try again.' }
    },
    async signUp(email, password, profile) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: getSignUpRedirectUrl(),
          data: { owner_name: profile.ownerName.trim(), phone_number: profile.phoneNumber.trim(), vehicle_name: profile.vehicleName.trim() },
        },
      })
      if (error) return error.message
      if (data.session) {
        await supabase.auth.signOut()
        return 'Email verification is disabled in this Supabase project. Enable email confirmations and configure the confirmation email to include the six-digit code, then try again.'
      }
      return null
      } catch { return 'Could not create your account. Check your connection and try again.' }
    },
    async verifySignUpOtp(email, token) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
        const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'signup' })
        return error?.message ?? null
      } catch { return 'Could not verify the code. Check your connection and try again.' }
    },
    async resendSignUpOtp(email) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
        const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: getSignUpRedirectUrl() } })
        return error?.message ?? null
      } catch { return 'Could not resend the code. Check your connection and try again.' }
    },
    async sendPasswordReset(email) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getResetRedirectUrl() })
        return error?.message ?? null
      } catch { return 'Could not send the reset email. Check your connection and try again.' }
    },
    async updatePassword(password) {
      if (!supabase) return 'Supabase is not configured yet.'
      try {
        const { error } = await supabase.auth.updateUser({ password })
        return error?.message ?? null
      } catch { return 'Could not update your password. Check your connection and try again.' }
    },
    async signOut() {
      if (!supabase) return null
      try {
        const { error } = await supabase.auth.signOut()
        return error?.message ?? null
      } catch { return 'Could not sign out. Check your connection and try again.' }
    },
  }), [isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
