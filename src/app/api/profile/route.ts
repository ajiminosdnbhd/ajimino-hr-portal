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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT server-side using the HTTP-only cookie.
  // It also triggers a token refresh if needed and writes the new token
  // back to the cookie, so the browser client stays in sync.
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ profile: null }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Profile fetch error:', profileError.message)
    return NextResponse.json({ profile: null }, { status: 500 })
  }

  return NextResponse.json({ profile })
}
