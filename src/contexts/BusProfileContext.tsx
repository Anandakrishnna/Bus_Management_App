import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { normalizeBusProfile } from '../lib/profile'
import { supabase } from '../lib/supabase'
import type { BusProfile, BusProfileInput } from '../types/bus'
import { useAuth } from './AuthContext'

type ProfileStatus = 'idle' | 'loading' | 'ready' | 'error'

type BusProfileContextValue = {
  profile: BusProfile | null
  status: ProfileStatus
  error: string | null
  refreshProfile: () => Promise<void>
  saveProfile: (input: BusProfileInput) => Promise<string | null>
}

const BusProfileContext = createContext<BusProfileContextValue | null>(null)

export function BusProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<BusProfile | null>(null)
  const [status, setStatus] = useState<ProfileStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!supabase || !user) {
      setProfile(null)
      setStatus('idle')
      return
    }

    setStatus('loading')
    setError(null)
    const { data, error: requestError } = await supabase
      .from('bus_profile')
      .select('owner_id, registration_number, name, route, created_at, updated_at')
      .maybeSingle()

    if (requestError) {
      setProfile(null)
      setError(requestError.message)
      setStatus('error')
      return
    }

    setProfile(data as BusProfile | null)
    setStatus('ready')
  }, [user])

  useEffect(() => {
    const loadProfile = async () => {
      await Promise.resolve()
      await refreshProfile()
    }
    void loadProfile()
  }, [refreshProfile])

  const saveProfile = useCallback(async (input: BusProfileInput): Promise<string | null> => {
    if (!supabase || !user) return 'Your session has ended. Please sign in again.'
    const normalized = normalizeBusProfile(input)
    const { error: requestError } = await supabase.from('bus_profile').upsert({
      owner_id: user.id,
      registration_number: normalized.registrationNumber,
      name: normalized.name || null,
      route: normalized.route || null,
    })

    if (requestError) return requestError.message
    await refreshProfile()
    return null
  }, [refreshProfile, user])

  const value = useMemo<BusProfileContextValue>(() => ({ profile, status, error, refreshProfile, saveProfile }), [error, profile, refreshProfile, saveProfile, status])
  return <BusProfileContext.Provider value={value}>{children}</BusProfileContext.Provider>
}

export function useBusProfile(): BusProfileContextValue {
  const context = useContext(BusProfileContext)
  if (!context) throw new Error('useBusProfile must be used within BusProfileProvider')
  return context
}
