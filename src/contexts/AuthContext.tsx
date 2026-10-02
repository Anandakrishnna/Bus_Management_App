import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthContextValue = {
  configured: boolean
  isLoading: boolean
  session: Session | null
  user: User | null
  signIn: (email: string, password: string) => Promise<string | null>
  sendPasswordReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getResetRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/reset-password`
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
      setIsLoading(false)
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
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return error?.message ?? null
    },
    async sendPasswordReset(email) {
      if (!supabase) return 'Supabase is not configured yet.'
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getResetRedirectUrl() })
      return error?.message ?? null
    },
    async updatePassword(password) {
      if (!supabase) return 'Supabase is not configured yet.'
      const { error } = await supabase.auth.updateUser({ password })
      return error?.message ?? null
    },
    async signOut() {
      if (!supabase) return null
      const { error } = await supabase.auth.signOut()
      return error?.message ?? null
    },
  }), [isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
