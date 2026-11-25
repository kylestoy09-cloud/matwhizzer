// Wrestler search on the year's Individual Post Season page (Kyle 2026-11-14): everyone entered in that season's
// districts, regions or states, by name (each word typed appears in the first or last name), with school
// and how far they went. A Playoff History season not switched on answers only an admin (canSeeHiddenHistory).
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/public-cached'
import { getSeasons, getHistorySeasons } from '@/lib/seasons-server'
import { canSeeHiddenHistory } from '@/lib/get-season'
import { regionLabels } from '@/lib/postseasonSeason'
import { getSchoolSeasonNames } from '@/lib/schoolSeasonNames'

export const dynamic = 'force-dynamic'

type Row = { id: string; wrestler_id: string | null; school_id: number | null; tournament: { tournament_type: string; name: string } | null; wrestler: { first_name: string; last_name: string } | null; school: { display_name: string } | null }
const LEVEL: Record<string, number> = { districts: 1, regions: 2, girls_regions: 2, boys_state: 3, girls_state: 3 }

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const g = p.get('gender') === 'F' ? 'F' : 'M'
  const season = Number(p.get('season'))
  const words = (p.get('q') ?? '').toLowerCase().replace(/[^a-z' -]/g, ' ').split(/\s+/).filter(w => w.length >= 2).slice(0, 4)
  if (!season || !words.length) return NextResponse.json({ rows: [] })
  const [seasons, history] = await Promise.all([getSeasons(), getHistorySeasons(g)])
  const h = history.find(x => x.id === season)
  const allowed = seasons.some(s => s.id === season && s.public_genders.includes(g)) || (h && (h.public || await canSeeHiddenHistory()))
  if (!allowed) return NextResponse.json({ rows: [] })

  let q = supabase.from('tournament_entries')
    .select('id, wrestler_id, school_id, tournament:tournaments!inner(tournament_type, name, season_id, gender), wrestler:wrestlers!inner(first_name, last_name), school:schools(display_name)')
    .eq('tournament.season_id', season).eq('tournament.gender', g).not('wrestler_id', 'is', null)
  for (const w of words) q = q.or(`first_name.ilike.%${w}%,last_name.ilike.%${w}%`, { referencedTable: 'wrestler' })
  const { data, error } = await q.limit(300)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []) as unknown as Row[]
  const { data: pl } = rows.length ? await supabase.from('placements').select('entry_id, place').in('entry_id', rows.map(r => r.id)) : { data: [] }
  const rl = await regionLabels(g, season)   // North I … in the seasons with named regions
  const placeOf = new Map((pl ?? []).map(x => [x.entry_id as string, x.place as number]))

  // one line per wrestler: school (from a district or region entry; state entries can have none), furthest event + place
  const by = new Map<string, { id: string; name: string; school_id: number | null; school: string | null; level: number; event: string; place: number | null }>()
  for (const r of rows) {
    const lv = LEVEL[r.tournament?.tournament_type ?? ''] ?? 0
    const ev = lv === 3 ? 'State' : lv === 2 ? rl.label(Number(/(\d+)$/.exec(r.tournament?.name ?? '')?.[1])) : `District ${/(\d+)$/.exec(r.tournament?.name ?? '')?.[1] ?? ''}`.trim()
    const cur = by.get(r.wrestler_id!) ?? { id: r.wrestler_id!, name: `${r.wrestler!.first_name} ${r.wrestler!.last_name}`, school_id: null, school: null, level: 0, event: '', place: null }
    if (cur.school_id == null && r.school_id != null) { cur.school_id = r.school_id; cur.school = r.school?.display_name ?? null }
    if (lv > cur.level) { cur.level = lv; cur.event = ev; cur.place = placeOf.get(r.id) ?? null }
    by.set(r.wrestler_id!, cur)
  }
  const names = await getSchoolSeasonNames(supabase as never, season, g, [...by.values()].map(r => r.school_id).filter((x): x is number => x != null))   // the school's name that season (co-ops)
  for (const r of by.values()) if (r.school_id != null) r.school = names.get(r.school_id) ?? r.school
  const out = [...by.values()].sort((a, b) => b.level - a.level || (a.place ?? 99) - (b.place ?? 99) || a.name.localeCompare(b.name)).slice(0, 25)
  return NextResponse.json({ rows: out.map(r => ({ id: r.id, name: r.name, school_id: r.school_id, school: r.school, event: r.event, place: r.place })) })
}
