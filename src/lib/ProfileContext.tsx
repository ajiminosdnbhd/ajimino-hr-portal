'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Profile } from '@/lib/types'
import { SupabaseClient } from '@supabase/supabase-js'
import { adminRead } from '@/lib/adminRead'

interface ProfileContextType {
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  loading: boolean
  supabase: SupabaseClient
}

const ProfileContext = createContext<ProfileContextType | null>(null)

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function ProfileProvider({
  children,
  initialProfile,
}: {
  children: React.ReactNode
  initialProfile: Profile | null
}) {
  // Profile is pre-loaded server-side — never in a loading state on mount.
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [loading] = useState(false)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { maxAge: COOKIE_MAX_AGE } }
  ), [])

  // Keep profile in sync with auth events (logout, token refresh, etc.)
  useEffect(() => {
    let mounted = true

    // Force the browser client to load its session from cookies immediately.
    // Without this call, queries that run before onAuthStateChange fires go out
    // unauthenticated and RLS returns empty results.
    supabase.auth.getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setProfile(null)
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          const { data: profData } = await adminRead<Profile>('profiles', {
            filters: [{ type: 'eq', col: 'id', val: session.user.id }]
          })
          if (mounted && profData[0]) setProfile(profData[0])
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
