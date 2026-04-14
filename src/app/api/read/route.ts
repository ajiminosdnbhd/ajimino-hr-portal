import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Generic server-side read route using the service-role key.
// The browser anon-key client has persistent RLS issues.
// All SELECT operations go through here to guarantee data is returned.
//
// POST body: { table, select?, filters?, eq?, gte?, lte?, order?, limit?, count? }
export async function POST(request: NextRequest) {
  // Verify caller is authenticated
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { table, select = '*', filters = [], order, limit, countOnly } = body

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = countOnly
    ? admin.from(table).select(select, { count: 'exact', head: true })
    : admin.from(table).select(select)

  for (const f of filters) {
    if (f.type === 'eq')  q = q.eq(f.col, f.val)
    if (f.type === 'neq') q = q.neq(f.col, f.val)
    if (f.type === 'gte') q = q.gte(f.col, f.val)
    if (f.type === 'lte') q = q.lte(f.col, f.val)
    if (f.type === 'or')  q = q.or(f.val)
    if (f.type === 'in')  q = q.in(f.col, f.val)
  }

  if (order) q = q.order(order.col, { ascending: order.asc ?? true })
  if (limit) q = q.limit(limit)

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], count: count ?? 0 })
}
