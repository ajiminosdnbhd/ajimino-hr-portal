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

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    let mounted = true

    async function fetchProfileForUser(userId: string) {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single()
      if (mounted && data) {
        setProfile(data as Profile)
        setLoading(false)
      }
    }

    // onAuthStateChange fires for ALL session events including INITIAL_SESSION
    // (auto-restore from cookies on browser reopen), SIGNED_IN, TOKEN_REFRESHED.
    // This is the PRIMARY auth path — it covers every case reliably.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) { setProfile(null); setLoading(false) }
        return
      }
      // INITIAL_SESSION = browser reopened and session restored from cookies
      // SIGNED_IN = fresh login   TOKEN_REFRESHED = token auto-renewed
      if (session?.user && mounted) {
        await fetchProfileForUser(session.user.id)
      }
    })

    // Fallback: if onAuthStateChange never fires (e.g. no local session),
    // call the server-side API route which reads from HTTP-only cookies.
    // This handles edge cases where the browser client can't read the session.
    const timer = setTimeout(async () => {
      if (!mounted || profile !== null) return
      try {
        const res = await fetch('/api/profile', { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          const { profile: data, access_token, refresh_token } = json
          if (mounted && data && profile === null) {
            if (access_token && refresh_token) {
              // Restore browser client session so subsequent queries have auth
              await supabase.auth.setSession({ access_token, refresh_token })
            }
            setProfile(data as Profile)
            setLoading(false)
          }
        } else {
          // No session at all — user is not logged in
          if (mounted) setLoading(false)
        }
      } catch {
        if (mounted) setLoading(false)
      }
    }, 500) // wait 500ms for onAuthStateChange to fire first

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

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
