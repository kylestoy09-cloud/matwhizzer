// Postseason bouts for the Daily Challenge research tabs (admin only, Kyle 2026-11-14), one side at a time
// (?gender=M|F), every season with brackets on file (Playoff History years included, hidden or not):
//   pins: every fall and tech fall at districts, regions and states, with its time (compact: names in `people`;
//         untimed = 6:00, a tech of 0:15 or under has no time)
//   champs: every state champion with the seed he won from (seeded state brackets only)
//   placed: every placer with a seed (Seeds tab: the best finishes from each seed)
// Cached an hour; a reload of the season data shows after that.
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { regionLabels } from '@/lib/postseasonSeason'

export const dynamic = 'force-dynamic'

type G = 'M' | 'F'
type Entry = { school_id: number | null; wrestler: { first_name: string; last_name: string } | null } | null

const load = (g: G) => unstable_cache(async () => {
  const db = createSupabaseAdmin()
  const all = async <T,>(q: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await q(from, from + 999)
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as T[]
      out.push(...rows)
      if (rows.length < 1000) return out
    }
  }
  const [tours, schools, wcs] = await Promise.all([
    all<{ id: number; season_id: number; name: string; tournament_type: string }>((f, t) => db.from('tournaments').select('id, season_id, name, tournament_type').eq('gender', g).order('id').range(f, t)),
    all<{ id: number; display_name: string }>((f, t) => db.from('schools').select('id, display_name').order('id').range(f, t)),
    all<{ id: number; weight: number }>((f, t) => db.from('weight_classes').select('id, weight').order('id').range(f, t)),
  ])
  const schoolName = new Map(schools.map(s => [s.id, s.display_name]))
  const weightOf = new Map(wcs.map(w => [w.id, w.weight]))
  // each tournament as the pages name it: District 12, Region 3 / North I, State
  const event = new Map<number, { year: number; level: 'district' | 'region' | 'state'; name: string }>()
  for (const t of tours) {
    const n = Number(/(\d+)$/.exec(t.name)?.[1])
    const level = t.tournament_type === 'districts' ? 'district' : t.tournament_type.endsWith('state') ? 'state' : 'region'
    const name = level === 'state' ? 'State' : level === 'district' ? `District ${n}` : (await regionLabels(g, t.season_id)).label(n)
    event.set(t.id, { year: t.season_id, level, name })
  }
  const people: string[] = [], personIdx = new Map<string, number>()
  const person = (e: Entry) => {
    if (!e?.wrestler) return -1
    const k = `${e.wrestler.first_name} ${e.wrestler.last_name}|${e.school_id != null ? schoolName.get(e.school_id) ?? 'TBD' : 'TBD'}`
    if (!personIdx.has(k)) { personIdx.set(k, people.length); people.push(k) }
    return personIdx.get(k)!
  }
  const ids = tours.map(t => t.id)
  // [tournament, weight, round, type 0 = pin / 1 = tech, seconds | null, winner, loser]
  const pins: (number | string | null)[][] = []
  for (let i = 0; i < ids.length; i += 40) {
    const rows = await all<{ tournament_id: number; weight_class_id: number; round: string; win_type: string; fall_time_seconds: number | null; w: Entry; l: Entry }>((f, t) =>
      db.from('matches').select('tournament_id, weight_class_id, round, win_type, fall_time_seconds, w:winner_entry_id(school_id, wrestler:wrestlers(first_name, last_name)), l:loser_entry_id(school_id, wrestler:wrestlers(first_name, last_name))')
        .in('tournament_id', ids.slice(i, i + 40)).eq('validated', true).in('win_type', ['FALL', 'TF', 'TF-1.5']).order('id').range(f, t))
    for (const m of rows) {
      // Kyle 2026-11-14: no time on file = 6:00; a tech at 0:15 or under isn't believable, so its time isn't used
      const tech = m.win_type !== 'FALL', secs = m.fall_time_seconds ?? 360
      pins.push([m.tournament_id, weightOf.get(m.weight_class_id) ?? null, m.round, tech ? 1 : 0, tech && secs <= 15 ? null : secs, person(m.w), person(m.l)])
    }
  }
  // state champions and their seeds
  const stateIds = tours.filter(t => t.tournament_type.endsWith('state')).map(t => t.id)
  const champRows = await all<{ tournament_id: number; weight_class_id: number; entry: (Entry & { seed: number | null }) | null }>((f, t) =>
    db.from('placements').select('tournament_id, weight_class_id, entry:entry_id(seed, school_id, wrestler:wrestlers(first_name, last_name))').in('tournament_id', stateIds).eq('place', 1).order('id').range(f, t))
  const champs = champRows.map(c => ({ year: event.get(c.tournament_id)!.year, weight: weightOf.get(c.weight_class_id) ?? null, seed: c.entry?.seed ?? null, person: person(c.entry) }))
  // every seeded placer (Kyle 2026-11-14: the best finishes from each seed): [tournament, weight, place, seed, wrestler].
  // Seeds are on file for the state brackets, and for districts and regions from 2024-25
  const placed: number[][] = []
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await all<{ tournament_id: number; weight_class_id: number; place: number; entry: (Entry & { seed: number }) | null }>((f, t) =>
      db.from('placements').select('tournament_id, weight_class_id, place, entry:entry_id!inner(seed, school_id, wrestler:wrestlers(first_name, last_name))').in('tournament_id', ids.slice(i, i + 100)).not('entry.seed', 'is', null).order('id').range(f, t))
    for (const r of rows) if (r.entry) placed.push([r.tournament_id, weightOf.get(r.weight_class_id) ?? 0, r.place, r.entry.seed, person(r.entry)])
  }
  return { events: Object.fromEntries(event), people, pins, champs, placed }
}, ['history-bouts-v3', g], { revalidate: 3600 })()

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const g: G = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  try { return NextResponse.json(await load(g)) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }) }
}
