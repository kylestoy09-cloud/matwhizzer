import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { createSupabaseServer } from '@/lib/supabase/server'
import ppTotals from '@/data/pp_totals.json'

export const dynamic = 'force-dynamic'

export type PPEntry = {
  name: string
  section: string
  record: string
  total: number
}

export type SchoolCount = {
  id: number
  displayName: string
  count: number
}

export type PPAuditData = {
  entries: PPEntry[]
  schools: SchoolCount[]
  checkedAt: string
}

export async function GET(req: NextRequest) {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawG = req.nextUrl.searchParams.get('gender')
  const gender: 'M' | 'F' = rawG === 'F' ? 'F' : 'M'

  const season = await getWorkingSeason(gender)
  const supabase = createSupabaseAdmin()

  const [schoolsRes, countsRes] = await Promise.all([
    supabase.from('schools').select('id, display_name').limit(2000),
    supabase.rpc('get_school_meet_counts', { p_season_id: season.id, p_gender: gender }),
  ])

  const countMap = new Map<number, number>()
  for (const r of countsRes.data ?? []) countMap.set(r.school_id, Number(r.meet_count))

  const schools: SchoolCount[] = (schoolsRes.data ?? []).map(s => ({
    id: s.id,
    displayName: s.display_name,
    count: countMap.get(s.id) ?? 0,
  }))

  const entries: PPEntry[] = (ppTotals as { name: string; record: string; total: number; section: string }[]).map(e => ({
    name: e.name,
    section: e.section,
    record: e.record,
    total: e.total,
  }))

  return NextResponse.json({ entries, schools, checkedAt: new Date().toISOString() } satisfies PPAuditData)
}
