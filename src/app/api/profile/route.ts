import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Server-side profile loader — reads session from HTTP-only cookies.
// This works even when the browser's localStorage is empty (e.g. after
// closing and reopening the browser without signing out).
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
          // Silently ignore: cookies cannot be set in a GET route handler.
          // The middleware already handles session refresh on every request,
          // so we don't need to refresh here.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Expected in GET handlers — session refresh is handled by middleware
          }
        },
      },
    }
  )

  // Use getUser() to validate the session with Supabase's auth server.
  // This is more reliable than getSession() which only reads cookies without
  // verifying the token is still valid.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ profile: null }, { status: 401 })
  }

  // Now get the session to retrieve the tokens we need to send back to the
  // browser client so it can restore its in-memory auth state.
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ profile: null }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError.message)
    return NextResponse.json({ profile: null }, { status: 500 })
  }

  // Return access_token + refresh_token so ProfileContext can call
  // supabase.auth.setSession() and restore auth in the browser client.
  // This makes ALL subsequent browser client queries (leaves, stats, etc.)
  // work correctly — even after browser close/reopen clears localStorage.
  return NextResponse.json({
    profile,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
}
