import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

async function requireAdmin() {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  return user
}

// GET /api/admin/oos-wrestlers
// Returns all OOS wrestlers with usage counts and suspected duplicate groups.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()

  // This side's OOS wrestlers (?gender=M|F; both when omitted)
  const g = req.nextUrl.searchParams.get('gender')
  let wq = supabase
    .from('wrestlers')
    .select('id, first_name, last_name, gender')
    .eq('is_oos', true)
  if (g === 'M' || g === 'F') wq = wq.eq('gender', g)
  const { data: wrestlers, error } = await wq
    .order('last_name')
    .order('first_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (wrestlers ?? []).map((w: { id: string }) => w.id)
  if (ids.length === 0) return NextResponse.json({ wrestlers: [], duplicates: [] })

  // Bout counts (wrestler appears as w1 or w2, across both boys and girls tables)
  const [{ data: w1Counts }, { data: w2Counts }, { data: gw1Counts }, { data: gw2Counts }, { data: plCounts }] = await Promise.all([
    supabase.from('tournament_bouts').select('wrestler1_id').in('wrestler1_id', ids),
    supabase.from('tournament_bouts').select('wrestler2_id').in('wrestler2_id', ids),
    (supabase as any).from('tournament_bouts_girls').select('wrestler1_id').in('wrestler1_id', ids),
    (supabase as any).from('tournament_bouts_girls').select('wrestler2_id').in('wrestler2_id', ids),
    supabase.from('tournament_placements').select('wrestler_id').in('wrestler_id', ids),
  ])

  const boutMap = new Map<string, number>()
  for (const r of (w1Counts ?? [])) boutMap.set(r.wrestler1_id, (boutMap.get(r.wrestler1_id) ?? 0) + 1)
  for (const r of (w2Counts ?? [])) boutMap.set(r.wrestler2_id, (boutMap.get(r.wrestler2_id) ?? 0) + 1)
  for (const r of (gw1Counts ?? [])) boutMap.set(r.wrestler1_id, (boutMap.get(r.wrestler1_id) ?? 0) + 1)
  for (const r of (gw2Counts ?? [])) boutMap.set(r.wrestler2_id, (boutMap.get(r.wrestler2_id) ?? 0) + 1)

  const placementMap = new Map<string, number>()
  for (const r of (plCounts ?? [])) placementMap.set(r.wrestler_id, (placementMap.get(r.wrestler_id) ?? 0) + 1)

  type WrestlerRow = {
    id: string
    first_name: string
    last_name: string
    gender: string
    display_name: string
    bout_count: number
    placement_count: number
  }

  const rows: WrestlerRow[] = (wrestlers ?? []).map((w: { id: string; first_name: string; last_name: string; gender: string }) => ({
    id:              w.id,
    first_name:      w.first_name,
    last_name:       w.last_name,
    gender:          w.gender,
    display_name:    `${w.first_name} ${w.last_name}`.trim(),
    bout_count:      boutMap.get(w.id) ?? 0,
    placement_count: placementMap.get(w.id) ?? 0,
  }))

  // Detect duplicates: same normalized full name (lowercase, collapse whitespace)
  const normalize = (r: WrestlerRow) =>
    `${r.first_name}|${r.last_name}|${r.gender}`.toLowerCase().replace(/\s+/g, ' ').trim()

  const grouped = new Map<string, WrestlerRow[]>()
  for (const r of rows) {
    const key = normalize(r)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  const duplicates = [...grouped.values()].filter(g => g.length > 1)

  return NextResponse.json({ wrestlers: rows, duplicates })
}

// POST /api/admin/oos-wrestlers
// Body: { action: 'merge', keep_id: string, merge_id: string }
// Re-points all FK references from merge_id → keep_id, then deletes merge_id.
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.action !== 'merge') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const { keep_id, merge_id } = body as { keep_id: string; merge_id: string }
  if (!keep_id || !merge_id || keep_id === merge_id) {
    return NextResponse.json({ error: 'Invalid ids' }, { status: 400 })
  }

  const supabase = db()

  // Verify both are OOS wrestlers
  const { data: checks } = await supabase
    .from('wrestlers')
    .select('id, is_oos')
    .in('id', [keep_id, merge_id])

  const both = (checks ?? []) as { id: string; is_oos: boolean }[]
  if (both.length !== 2 || both.some(w => !w.is_oos)) {
    return NextResponse.json({ error: 'One or both wrestlers not found or not OOS' }, { status: 400 })
  }

  // Re-point all references from merge_id → keep_id
  const updates = await Promise.all([
    supabase.from('tournament_bouts').update({ wrestler1_id: keep_id }).eq('wrestler1_id', merge_id),
    supabase.from('tournament_bouts').update({ wrestler2_id: keep_id }).eq('wrestler2_id', merge_id),
    (supabase as any).from('tournament_bouts_girls').update({ wrestler1_id: keep_id }).eq('wrestler1_id', merge_id),
    (supabase as any).from('tournament_bouts_girls').update({ wrestler2_id: keep_id }).eq('wrestler2_id', merge_id),
    supabase.from('tournament_placements').update({ wrestler_id: keep_id }).eq('wrestler_id', merge_id),
    supabase.from('tournament_entries').update({ wrestler_id: keep_id }).eq('wrestler_id', merge_id),
    supabase.from('wrestler_name_aliases').update({ wrestler_id: keep_id }).eq('wrestler_id', merge_id),
    supabase.from('ms_wrestlers').update({ hs_wrestler_id: keep_id }).eq('hs_wrestler_id', merge_id),
  ])

  const errs = updates.map(r => r.error).filter(Boolean)
  if (errs.length > 0) {
    return NextResponse.json({ error: errs[0]!.message }, { status: 500 })
  }

  // Delete merged wrestler
  const { error: delErr } = await supabase.from('wrestlers').delete().eq('id', merge_id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
