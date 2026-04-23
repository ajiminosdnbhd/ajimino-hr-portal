// Client-side helper that calls /api/read — a server route using the
// service-role key so RLS never blocks SELECT queries.
//
// RULE: Every read in this app must use adminRead().
//       Writes (insert/update/delete) still use supabase directly.

type Filter =
  | { type: 'eq' | 'neq' | 'gte' | 'lte'; col: string; val: string | number }
  | { type: 'or'; val: string }
  | { type: 'in'; col: string; val: (string | number)[] }

interface ReadOptions {
  select?: string
  filters?: Filter[]
  order?: { col: string; asc?: boolean }
  limit?: number
  countOnly?: boolean
}

export async function adminRead<T = Record<string, unknown>>(
  table: string,
  opts: ReadOptions = {}
): Promise<{ data: T[]; count: number; error?: string }> {
  try {
    const res = await fetch('/api/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, ...opts }),
    })
    const json = await res.json()
    if (!res.ok) {
      return { data: [], count: 0, error: json.error || `Failed to load ${table}` }
    }
    return json
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    return { data: [], count: 0, error: msg }
  }
}
