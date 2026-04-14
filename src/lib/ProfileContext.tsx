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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { maxAge: 60 * 60 * 24 * 365 } } // 1-year persistent cookie
  ), [])

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        // ── Step 1: browser client reads session directly from cookies ────
        // createBrowserClient stores the session in document.cookie.
        // getSession() reassembles it from cookie chunks — no network call.
        // This is the fastest, most reliable path after browser reopen.
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted && data) {
            setProfile(data as Profile)
            setLoading(false)
            return
          }
        }

        // ── Step 2: server-side fallback via HTTP-only cookies ────────────
        // Runs when the browser client cookie is missing/expired but the
        // server-side HTTP-only cookie is still valid.
        const res = await fetch('/api/profile', { credentials: 'include' })
        if (res.ok) {
          const { profile: data, access_token, refresh_token } = await res.json()
          if (mounted && data) {
            // Restore browser client session so all subsequent queries have auth
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token })
            }
            setProfile(data as Profile)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        console.error('loadProfile error:', err)
      }

      // No session found at all
      if (mounted) setLoading(false)
    }

    loadProfile()

    // ── Ongoing: react to auth events (login, logout, token refresh) ──────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) { setProfile(null); setLoading(false) }
        return
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user && mounted) {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted && data) { setProfile(data as Profile); setLoading(false) }
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
