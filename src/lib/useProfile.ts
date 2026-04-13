'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Profile } from '@/lib/types'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id

        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            if (mounted) setLoading(false)
            return
          }
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          if (mounted && data) setProfile(data as Profile)
          if (mounted) setLoading(false)
          return
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (mounted && data) setProfile(data as Profile)
      } catch (err) {
        console.error('Profile load error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted && data) setProfile(data as Profile)
        } else {
          if (mounted) setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  return { profile, loading, supabase, setProfile }
}
