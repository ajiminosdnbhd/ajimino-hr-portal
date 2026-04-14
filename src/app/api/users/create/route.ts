import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, name, department, role, al_entitled, ml_entitled, join_date, phone } = body

  // Use service role key — bypasses rate limits and email confirmation
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

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
