import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function extractNum(name: string): number {
  const m = name.match(/(\d+)/)
  return m ? parseInt(m[1]) : 0
}

// GET /api/admin/postseason-hub?type=district|region&gender=M|F&season=N
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type   = req.nextUrl.searchParams.get('type') ?? 'district'
  const gender = (req.nextUrl.searchParams.get('gender') ?? 'M') as 'M' | 'F'
  const season = Number(req.nextUrl.searchParams.get('season') ?? '2')

  const tournamentType = type === 'district' ? 'districts' : 'regions'
  const logoTable      = type === 'district' ? 'districts' : 'regions'
  const maxNum         = type === 'district' ? (gender === 'M' ? 32 : 12) : (gender === 'M' ? 8 : 4)

  const db = createSupabaseAdmin()

  // Logos from districts/regions table
  const { data: logoRows } = await db
    .from(logoTable)
    .select('id, logo_url, name')
    .lte('id', maxNum)
    .order('id')

  const logoMap = new Map<number, { logo_url: string | null; name: string | null }>()
  for (const r of logoRows ?? []) {
    logoMap.set(r.id, { logo_url: r.logo_url ?? null, name: r.name ?? null })
  }

  // All tournaments of this type for the season + gender
  const { data: tourRows, error: tErr } = await db
    .from('tournaments')
    .select('id, name, tournament_type, gender, season_id')
    .eq('tournament_type', tournamentType)
    .eq('season_id', season)
    .eq('gender', gender)
    .order('name')

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 })

  const tournaments = (tourRows ?? []).sort((a, b) => extractNum(a.name) - extractNum(b.name))

  // Entry counts per tournament
  const tourIds = tournaments.map(t => String(t.id))
  const { data: entryRows } = tourIds.length > 0
    ? await db.from('tournament_entries').select('tournament_id').in('tournament_id', tourIds)
    : { data: [] }

  const entryCounts = new Map<string, number>()
  for (const e of entryRows ?? []) {
    const k = String(e.tournament_id)
    entryCounts.set(k, (entryCounts.get(k) ?? 0) + 1)
  }

  // Placement counts per tournament
  const { data: placRows } = tourIds.length > 0
    ? await db.from('tournament_placements').select('tournament_id').in('tournament_id', tourIds)
    : { data: [] }

  const placCounts = new Map<string, number>()
  for (const p of placRows ?? []) {
    const k = String(p.tournament_id)
    placCounts.set(k, (placCounts.get(k) ?? 0) + 1)
  }

  // Build response: one item per num (1..maxNum)
  // Match tournament to num via name extraction, fall back to sorted position
  const tourByNum = new Map<number, typeof tournaments[0]>()
  for (const t of tournaments) {
    const n = extractNum(t.name)
    if (n >= 1 && n <= maxNum) tourByNum.set(n, t)
  }

  const items = Array.from({ length: maxNum }, (_, i) => {
    const num  = i + 1
    const tour = tourByNum.get(num) ?? null
    const logo = logoMap.get(num) ?? null
    const tid  = tour ? String(tour.id) : null
    return {
      num,
      tournament_id:    tour?.id ?? null,
      name:             tour?.name ?? `${type === 'district' ? 'District' : 'Region'} ${num}`,
      logo_url:         logo?.logo_url ?? null,
      display_name:     logo?.name ?? null,
      entry_count:      tid ? (entryCounts.get(tid) ?? 0) : 0,
      placement_count:  tid ? (placCounts.get(tid) ?? 0) : 0,
    }
  })

  return NextResponse.json({ items, season, gender, type: tournamentType })
}
