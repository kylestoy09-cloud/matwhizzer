import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

type CsvRow = Record<string, string>

// POST /api/admin/bulk-coach-match
// Body: { rows: CsvRow[] }
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await req.json().catch(() => ({ rows: [] }))
  if (!Array.isArray(rows)) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  // Load all NJ schools
  const { data: schools } = await db.from('schools').select('id, display_name, short_name').eq('is_nj', true)
  const schoolList = (schools ?? []) as { id: number; display_name: string; short_name: string | null }[]

  const byId   = new Map(schoolList.map(s => [s.id, s]))
  const byName = new Map<string, typeof schoolList[0]>()
  for (const s of schoolList) {
    byName.set(s.display_name.toLowerCase(), s)
    if (s.short_name) byName.set(s.short_name.toLowerCase(), s)
  }

  // Load existing coaches (to detect update vs create), if table exists
  let existingCoaches: { id: string; name: string; school_id: number }[] = []
  try {
    const { data: coachData, error: coachErr } = await db
      .from('coaches').select('id, name, school_id')
    if (!coachErr) existingCoaches = coachData ?? []
  } catch { /* coaches table not yet created */ }

  const coachKey = (name: string, schoolId: number) => `${name.toLowerCase().trim()}:${schoolId}`
  const existingMap = new Map(existingCoaches.map(c => [coachKey(c.name, c.school_id), c.id]))

  const preview = rows.map((row: CsvRow) => {
    const coachName  = row['name']?.trim() ?? ''
    const title      = row['title']?.trim() ?? ''
    const email      = row['email']?.trim() ?? ''
    const phone      = row['phone']?.trim() ?? ''

    // Match school
    let school: typeof schoolList[0] | null = null
    if (row['school_id']) {
      school = byId.get(parseInt(row['school_id'], 10)) ?? null
    } else if (row['school_name']) {
      const q = row['school_name'].toLowerCase()
      school = byName.get(q) ?? null
      if (!school) {
        for (const [name, s] of byName) {
          if (name.includes(q) || q.includes(name)) { school = s; break }
        }
      }
    }

    if (!school) {
      return { coach_name: coachName, school_id: null, school_name: row['school_name'] ?? '', matched: false, title, email, phone, action: 'skip' as const }
    }

    const existing_id = existingMap.get(coachKey(coachName, school.id))

    return {
      coach_name:  coachName,
      school_id:   school.id,
      school_name: school.display_name,
      matched:     true,
      title, email, phone,
      action:      existing_id ? 'update' as const : 'create' as const,
      existing_id,
    }
  })

  return NextResponse.json({ preview })
}
