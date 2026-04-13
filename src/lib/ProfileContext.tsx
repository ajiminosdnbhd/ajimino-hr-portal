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

    // onAuthStateChange fires INITIAL_SESSION immediately on mount with the
    // restored cookie session — handles browser reopen without sign-out,
    // fresh login, and logout all in one place.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted && data) setProfile(data as Profile)
        } catch (err) {
          console.error('Profile load error:', err)
        }
      } else {
        if (mounted) setProfile(null)
      }
      if (mounted) setLoading(false)
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
