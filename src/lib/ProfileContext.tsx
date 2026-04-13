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

    async function loadProfile() {
      try {
        // Primary path: call server-side API route which reads the session
        // from HTTP-only cookies. This ALWAYS works — even when the browser
        // was closed and reopened (localStorage cleared), because HTTP-only
        // cookies are persistent and don't get wiped on browser close.
        const res = await fetch('/api/profile', { credentials: 'include' })
        if (res.ok) {
          const { profile: data } = await res.json()
          if (mounted && data) {
            setProfile(data as Profile)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        console.error('Profile API error:', err)
      }

      if (mounted) setLoading(false)
    }

    loadProfile()

    // Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const { data } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted && data) { setProfile(data as Profile); setLoading(false) }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) { setProfile(null); setLoading(false) }
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
