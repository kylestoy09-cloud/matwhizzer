import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const EDITABLE_FIELDS = [
  'display_name', 'short_name', 'mascot', 'nickname',
  'color_primary', 'color_secondary', 'color_tertiary', 'header_background',
  'town', 'county', 'section', 'classification', 'athletic_conference',
  'website_url', 'twitter_handle', 'logo_url',
]

type CsvRow = Record<string, string>

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// POST /api/admin/bulk-school-match
// Body: { rows: CsvRow[] }
// Returns: { diffs: DiffRow[] }
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await req.json().catch(() => ({ rows: [] }))
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  // Load all NJ schools
  const { data: schools } = await db
    .from('schools')
    .select('id, display_name, short_name, ' + EDITABLE_FIELDS.join(', '))
    .eq('is_nj', true)

  const schoolList = (schools ?? []) as unknown as Record<string, unknown>[]

  // Build lookup maps
  const byId   = new Map<number, Record<string, unknown>>()
  const byName = new Map<string, Record<string, unknown>>()
  for (const s of schoolList) {
    byId.set(s.id as number, s)
    byName.set((s.display_name as string).toLowerCase(), s)
    if (s.short_name) byName.set((s.short_name as string).toLowerCase(), s)
  }

  const diffs = rows.map((row: CsvRow) => {
    // Identify school
    let matched: Record<string, unknown> | null = null
    let matchConfidence: 'exact' | 'fuzzy' | 'none' = 'none'
    const schoolName = row['name'] ?? row['display_name'] ?? ''

    if (row['school_id']) {
      const id = parseInt(row['school_id'], 10)
      matched = byId.get(id) ?? null
      if (matched) matchConfidence = 'exact'
    } else if (schoolName) {
      // Exact match first
      matched = byName.get(schoolName.toLowerCase()) ?? null
      if (matched) {
        matchConfidence = 'exact'
      } else {
        // Fuzzy: find first school whose name contains the query or vice versa
        const q = schoolName.toLowerCase()
        for (const [name, school] of byName) {
          if (name.includes(q) || q.includes(name)) {
            matched = school
            matchConfidence = 'fuzzy'
            break
          }
        }
      }
    }

    // Build diff
    const changes: Array<{ field: string; before: string | null; after: string }> = []
    for (const field of EDITABLE_FIELDS) {
      const newVal = row[field]
      if (newVal === undefined || newVal === '') continue
      const before = matched ? (matched[field] as string | null | undefined) ?? null : null
      const beforeStr = before === null ? null : String(before)
      const afterStr  = newVal.trim()
      if (beforeStr !== afterStr) {
        changes.push({ field, before: beforeStr, after: afterStr })
      }
    }

    return {
      school_id:        matched ? (matched.id as number) : null,
      school_name:      matched ? (matched.display_name as string) : schoolName,
      matched:          matched !== null,
      match_confidence: matchConfidence,
      changes,
    }
  })

  return NextResponse.json({ diffs })
}
