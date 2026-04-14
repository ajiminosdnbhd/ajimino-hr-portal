import { createBrowserClient } from '@supabase/ssr'

// maxAge: 1 year in seconds — keeps the session cookie persistent across
// browser closes and reopens. Without this, createBrowserClient stores
// the session in a session cookie (no expiry) that browsers delete on close,
// causing the "Welcome back / name missing" bug on every reopen.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { maxAge: COOKIE_MAX_AGE } }
  )
}
