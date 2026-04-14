import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Cookies cannot be set in GET route handlers — silently ignore.
          // The middleware handles session refresh on every request.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* expected in GET handlers */ }
        },
      },
    }
  )

  // Validate the session against Supabase's auth server (reliable, handles expiry)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ profile: null }, { status: 401 })
  }

  // Fetch the profile row using the validated user id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ profile: null }, { status: 500 })
  }

  // Try to get the full session tokens so the browser client can call
  // setSession() and restore in-memory auth for subsequent queries.
  // This may return null if the session chunk cookies aren't present —
  // that's fine, the browser's onAuthStateChange handles restoration too.
  const { data: { session } } = await supabase.auth.getSession()

  return NextResponse.json({
    profile,
    access_token: session?.access_token ?? null,
    refresh_token: session?.refresh_token ?? null,
  })
}
