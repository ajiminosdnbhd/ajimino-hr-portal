import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Verify the caller is authenticated AND is HR or Management
  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user: caller } } = await supabaseAuth.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service role key — bypasses rate limits and email confirmation
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check caller's role — only HR and Management may create accounts
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()
  if (!callerProfile || (callerProfile.role !== 'hr' && callerProfile.role !== 'management')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, name, department, role, al_entitled, ml_entitled, join_date, phone } = body

  // Basic input validation
  if (!email || !password || !name || !department || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create auth user without sending confirmation email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // auto-confirm, no email sent
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Insert profile
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: authData.user.id,
    name,
    department,
    role,
    al_entitled,
    ml_entitled,
    al_used: 0,
    ml_used: 0,
    join_date,
    phone: phone || null,
  })

  if (profileError) {
    // Rollback: delete the auth user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
