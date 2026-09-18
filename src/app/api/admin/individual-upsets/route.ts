import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// GET /api/admin/individual-upsets
// ?week_id=1&gender=M&weight_class=106
//
// Returns stored upsets with wrestler names/schools/grades joined in.
// Also returns is_complete and multiple-appearance counts.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const weekId      = searchParams.get('week_id')
  const gender      = searchParams.get('gender') ?? 'M'
  const weightClass = parseInt(searchParams.get('weight_class') ?? '0', 10)

  if (!weekId || !weightClass) return NextResponse.json({ upsets: [], is_complete: false })

  const db = createSupabaseAdmin()

  // Load upsets and completion status in parallel
  const [upsetRes, compRes] = await Promise.all([
    db.from('individual_upsets')
      .select('*')
      .eq('week_id',      weekId)
      .eq('gender',       gender)
      .eq('weight_class', weightClass)
      .order('differential', { ascending: false }),

    db.from('individual_upset_completion')
      .select('id, completed_at, completed_by')
      .eq('week_id',      weekId)
      .eq('gender',       gender)
      .eq('weight_class', weightClass)
      .maybeSingle(),
  ])

  const rawUpsets = upsetRes.data ?? []
  if (!rawUpsets.length) {
    return NextResponse.json({ upsets: [], is_complete: !!compRes.data, completed_at: compRes.data?.completed_at ?? null })
  }

  // Collect all unique wrestler IDs (winners + losers)
  const allIds = new Set<string>()
  for (const u of rawUpsets) {
    allIds.add(u.winner_id as string)
    allIds.add(u.loser_id  as string)
  }

  // Bulk-fetch wrestler names + school + grade
  type WInfo = { id: string; first_name: string; last_name: string; grade: string | null; schools: { display_name: string } | null }
  const infoMap = new Map<string, WInfo>()
  for (const ids of chunk([...allIds], 100)) {
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, grade, schools(display_name)')
      .in('id', ids)
    for (const r of (data ?? []) as any[]) {
      infoMap.set(r.id, {
        id:         r.id,
        first_name: r.first_name ?? '',
        last_name:  r.last_name  ?? '',
        grade:      r.grade ?? null,
        schools:    r.schools,
      })
    }
  }

  // Also fetch district/region names for readable labels
  const districtIds = new Set<number>()
  for (const u of rawUpsets) {
    if (u.winner_district) districtIds.add(u.winner_district as number)
    if (u.loser_district)  districtIds.add(u.loser_district  as number)
  }
  const districtTable = gender === 'F' ? 'girls_districts' : 'boys_districts'
  const districtNameMap = new Map<number, string>()
  if (districtIds.size) {
    const { data } = await db
      .from(districtTable)
      .select('id, name')
      .in('id', [...districtIds])
    for (const r of (data ?? []) as { id: number; name: string }[]) {
      districtNameMap.set(r.id, r.name)
    }
  }

  // ── Multiple-appearance detection ─────────────────────────────────────────────
  // Count how many upsets each wrestler appears in as winner vs loser this week+weight
  const winCount  = new Map<string, number>()  // wrestler appears as underdog winner N times
  const lossCount = new Map<string, number>()  // wrestler appears as upset victim N times
  for (const u of rawUpsets) {
    winCount.set(u.winner_id as string,  (winCount.get(u.winner_id  as string)  ?? 0) + 1)
    lossCount.set(u.loser_id as string, (lossCount.get(u.loser_id as string) ?? 0) + 1)
  }

  // ── Assemble response ─────────────────────────────────────────────────────────
  const upsets = rawUpsets.map((u: any) => {
    const winner = infoMap.get(u.winner_id)
    const loser  = infoMap.get(u.loser_id)
    return {
      id:                 u.id,
      winner_id:          u.winner_id,
      winner_name:        winner ? `${winner.first_name} ${winner.last_name}` : '—',
      winner_school:      (winner?.schools as any)?.display_name ?? '',
      winner_grade:       winner?.grade ?? null,
      winner_district:    u.winner_district,
      winner_district_name: u.winner_district ? (districtNameMap.get(u.winner_district) ?? `District ${u.winner_district}`) : null,
      winner_region:      u.winner_region,
      winner_section:     u.winner_section,
      // Multiple-appearance flags
      winner_multi_win:   (winCount.get(u.winner_id)  ?? 0) > 1,   // beat multiple higher-ranked
      winner_multi_loss:  (lossCount.get(u.winner_id) ?? 0) > 0,   // also suffered an upset themselves
      loser_id:           u.loser_id,
      loser_name:         loser ? `${loser.first_name} ${loser.last_name}` : '—',
      loser_school:       (loser?.schools as any)?.display_name ?? '',
      loser_grade:        loser?.grade ?? null,
      loser_district:     u.loser_district,
      loser_district_name: u.loser_district ? (districtNameMap.get(u.loser_district) ?? `District ${u.loser_district}`) : null,
      loser_region:       u.loser_region,
      loser_section:      u.loser_section,
      loser_multi_loss:   (lossCount.get(u.loser_id)  ?? 0) > 1,   // suffered multiple upsets
      loser_multi_win:    (winCount.get(u.loser_id)   ?? 0) > 0,   // also pulled an upset themselves
      winner_pre_hammer:  u.winner_pre_hammer,
      loser_pre_hammer:   u.loser_pre_hammer,
      differential:       u.differential,
      win_type:           u.win_type,
      match_date:         u.match_date,
      match_source:       u.match_source,
      include_in_publish: u.include_in_publish,
      same_district:      u.winner_district !== null && u.winner_district === u.loser_district,
      same_region:        u.winner_region   !== null && u.winner_region   === u.loser_region,
      same_section:       u.winner_section  !== null && u.winner_section  === u.loser_section,
    }
  })

  return NextResponse.json({
    upsets,
    is_complete:  !!compRes.data,
    completed_at: compRes.data?.completed_at ?? null,
    completed_by: compRes.data?.completed_by ?? null,
  })
}
