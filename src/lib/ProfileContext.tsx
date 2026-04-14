'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Profile } from '@/lib/types'
import { SupabaseClient } from '@supabase/supabase-js'

interface ProfileContextType {
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  loading: boolean
  supabase: SupabaseClient
}

const ProfileContext = createContext<ProfileContextType | null>(null)

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
const LS_KEY = 'ajimino_session_backup'

function saveSessionToStorage(access_token: string, refresh_token: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ access_token, refresh_token }))
  } catch { /* localStorage blocked (private mode etc.) — ignore */ }
}

function loadSessionFromStorage(): { access_token: string; refresh_token: string } | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function clearSessionFromStorage() {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { maxAge: COOKIE_MAX_AGE } }
  ), [])

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        clearSessionFromStorage()
        setProfile(null)
        setLoading(false)
        return
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        if (session?.user) {
          // Persist tokens to localStorage so browser-close/cookie-clear is survivable
          if (session.access_token && session.refresh_token) {
            saveSessionToStorage(session.access_token, session.refresh_token)
          }
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted) {
            setProfile((data as Profile) ?? null)
            setLoading(false)
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session in cookies — try localStorage backup before giving up
          const backup = loadSessionFromStorage()
          if (backup) {
            // setSession() writes new cookies AND fires SIGNED_IN or TOKEN_REFRESHED
            // which will re-enter this handler with a valid session
            const { error } = await supabase.auth.setSession(backup)
            if (error) {
              // Backup tokens are also invalid — clear and mark unauthenticated
              clearSessionFromStorage()
              if (mounted) setLoading(false)
            }
            // If setSession succeeds, the SIGNED_IN / TOKEN_REFRESHED event
            // will fire and load the profile — don't setLoading(false) here
          } else {
            // No cookies, no localStorage — user is genuinely logged out
            if (mounted) setLoading(false)
          }
        }
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [supabase])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading, supabase }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
