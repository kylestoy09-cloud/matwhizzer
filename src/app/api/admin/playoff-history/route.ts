// Playoff History Review (Kyle 2026-11-13; boys 2013-2024, girls 2019-2024 regions + state): past postseasons staged
// from TrackWrestling exports by scripts/playoff_history_stage.mts, reviewed here before a season loads and is
// switched on. Every call names its side (boys and girls are separate programs).
//   GET ?gender=M|F                                                    → seasons, team names, schools list
//   PATCH { gender, raw_name, school_id | placeholder | reset, coop_name } → Kyle's call on one team name
//   POST  { gender, action: 'publish', season_id, on }                 → switch a loaded season on / off for the site
//   GET  ?gender=&joins=1                                              → the Same wrestler candidates
//   POST  { gender, action: 'find_joins' }                             → find candidates (Kyle's calls kept)
//   POST  { gender, action: 'decide', ids: [], decision: 'same' | 'different' | 'pending' } → Kyle's call on candidates
//   POST  { gender, action: 'assign_people' }                          → every staged entry → its wrestler (needs none pending)
//   POST  { gender, action: 'load' | 'unload', season_id }             → write / remove a season's brackets (stays hidden)
//   POST  { gender, action: 'new_school', raw_name, name }             → a school that closed or never had a record
//         (Bishop Ahr, Queen of Peace …): an NJ school named as Kyle types it, assigned to that team name
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { findCandidates, assignPeople } from '@/lib/playoffHistory/identity'
import { loadSeason, unloadSeason } from '@/lib/playoffHistory/load'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

async function all<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}

const sideOf = (g: unknown) => (g === 'F' ? 'F' : g === 'M' ? 'M' : null)

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const G = sideOf(req.nextUrl.searchParams.get('gender'))
  if (!G) return bad('gender must be M or F')
  const db = createSupabaseAdmin()
  if (req.nextUrl.searchParams.get('joins')) {
    try {
      const joins = await all<Record<string, unknown>>((f, t) => db.from('playoff_history_joins').select('id, a_season, a_name, a_team, b_season, b_name, b_team, b_wrestler_id, reason, decision, decided_by, context').eq('gender', G).order('reason').order('a_season').order('id').range(f, t))
      return NextResponse.json({ joins })
    } catch (e) { return bad((e as Error).message, 500) }
  }
  try {
    const [seasons, state, labels, names, schools] = await Promise.all([
      db.from('playoff_history_seasons').select('season_id, status, summary, problems, staged_at, loaded_at, loaded_by').eq('gender', G).order('season_id'),
      db.from('season_gender_state').select('*').eq('gender', G).eq('stage', 'history'),
      db.from('seasons').select('id, year_label'),
      all<Record<string, unknown>>((f, t) => db.from('playoff_history_schools').select('raw_name, school_id, decision, coop_name, seasons, suggestion, note, decided_by, decided_at').eq('gender', G).order('raw_name').range(f, t)),
      all<Record<string, unknown>>((f, t) => db.from('schools').select('id, display_name, is_nj').order('display_name').range(f, t)),
    ])
    for (const r of [seasons, state, labels]) if (r.error) return bad(r.error.message, 500)
    const label = new Map((labels.data ?? []).map(s => [s.id, s.year_label]))
    const on = new Map((state.data ?? []).map(s => [s.season_id, !!(s as { history_public?: boolean }).history_public]))
    return NextResponse.json({
      seasons: (seasons.data ?? []).map(s => ({ ...s, label: label.get(s.season_id) ?? String(s.season_id), public: on.get(s.season_id) ?? false })),
      history_seasons: [...on.keys()].sort(),
      names,
      schools: schools.filter(s => s.is_nj).map(s => ({ id: s.id, name: s.display_name })),
    })
  } catch (e) {
    return bad((e as Error).message, 500)
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null) as { gender?: string; raw_name?: string; school_id?: number | null; placeholder?: boolean; coop_name?: string | null; reset?: boolean } | null
  const G = sideOf(b?.gender)
  if (!b?.raw_name || !G) return bad('gender and raw_name are required')
  const db = createSupabaseAdmin()
  const update = b.reset
    ? { decision: 'pending', school_id: null, coop_name: null, decided_by: null, decided_at: null }
    : b.placeholder
      ? { decision: 'placeholder', school_id: null, coop_name: null, decided_by: user.email ?? null, decided_at: new Date().toISOString() }
      : { decision: 'kyle', school_id: b.school_id ?? null, coop_name: b.coop_name?.trim() || null, decided_by: user.email ?? null, decided_at: new Date().toISOString() }
  if (!b.reset && !b.placeholder && !b.school_id) return bad('pick a school, or mark it an empty slot')
  const { data, error } = await db.from('playoff_history_schools').update(update).eq('gender', G).eq('raw_name', b.raw_name).select('raw_name, school_id, decision, coop_name, decided_by, decided_at')
  if (error) return bad(error.message, 500)
  if (!data?.length) return bad('unknown team name', 404)
  return NextResponse.json({ name: data[0] })
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null) as { gender?: string; action?: string; season_id?: number; on?: boolean; raw_name?: string; name?: string; ids?: number[]; decision?: string } | null
  const G = sideOf(b?.gender)
  if (G && b?.action === 'find_joins') {
    try { return NextResponse.json(await findCandidates(createSupabaseAdmin(), G)) } catch (e) { return bad((e as Error).message, 500) }
  }
  if (G && (b?.action === 'load' || b?.action === 'unload')) {
    if (!b.season_id) return bad('season_id is required')
    try {
      const db = createSupabaseAdmin()
      return NextResponse.json(b.action === 'load' ? await loadSeason(db, G, b.season_id, user.email ?? null) : await unloadSeason(db, G, b.season_id))
    } catch (e) { return bad((e as Error).message, 500) }
  }
  if (G && b?.action === 'assign_people') {
    try { return NextResponse.json(await assignPeople(createSupabaseAdmin(), G)) } catch (e) { return bad((e as Error).message, 500) }
  }
  if (G && b?.action === 'decide') {
    if (!Array.isArray(b.ids) || !b.ids.length || !['same', 'different', 'pending'].includes(b.decision ?? '')) return bad('ids and decision (same / different / pending) are required')
    const pending = b.decision === 'pending'
    // a "same" can't make one wrestler span more than four seasons or join two existing profiles (Kyle 2026-11-14)
    if (b.decision === 'same') {
      const problem = await sameConflict(createSupabaseAdmin(), G, b.ids)
      if (problem) return bad(problem, 409)
    }
    const { data, error } = await createSupabaseAdmin().from('playoff_history_joins')
      .update({ decision: b.decision, decided_by: pending ? null : user.email ?? null, decided_at: pending ? null : new Date().toISOString() })
      .eq('gender', G).in('id', b.ids).select('id, decision, decided_by')
    if (error) return bad(error.message, 500)
    return NextResponse.json({ joins: data })
  }
  if (b?.action === 'new_school' && G) {
    const name = b.name?.trim()
    if (!name || !b.raw_name) return bad('raw_name and name are required')
    const db = createSupabaseAdmin()
    const { data: same } = await db.from('schools').select('id').ilike('display_name', name)
    if (same?.length) return bad(`a school named “${name}” already exists (#${same[0].id}): pick it instead`)
    const { data: made, error: e1 } = await db.from('schools').insert({ display_name: name, is_nj: true }).select('id, display_name').single()
    if (e1) return bad(e1.message, 500)
    const { data, error } = await db.from('playoff_history_schools').update({ decision: 'kyle', school_id: made.id, decided_by: user.email ?? null, decided_at: new Date().toISOString() })
      .eq('gender', G).eq('raw_name', b.raw_name).select('raw_name, school_id, decision, coop_name, decided_by, decided_at')
    if (error) return bad(error.message, 500)
    return NextResponse.json({ name: data?.[0], school: { id: made.id, name: made.display_name } })
  }
  if (b?.action !== 'publish' || !b.season_id || !G) return bad('gender, action publish and season_id are required')
  const db = createSupabaseAdmin()
  const { data: s } = await db.from('playoff_history_seasons').select('status').eq('season_id', b.season_id).eq('gender', G).maybeSingle()
  if (b.on && s?.status !== 'loaded') return bad('load the season before switching it on')
  const { data, error } = await db.from('season_gender_state').update({ history_public: !!b.on }).eq('season_id', b.season_id).eq('gender', G).eq('stage', 'history').select('season_id')
  if (error) return bad(error.message, 500)
  if (!data?.length) return bad('not a Playoff History season', 404)
  const side = G === 'F' ? 'girls' : 'boys'
  for (const p of [`/${side}/districts`, `/${side}/regions`, `/${side}/state`]) revalidatePath(p, 'layout')
  return NextResponse.json({ ok: true, public: !!b.on })
}

// Everything marked Same (plus these) as groups: each maybe's two sides are history lines (their seasons in context)
// or an existing profile (its seasons with us). A group may hold one existing profile and four seasons at most.
export async function sameConflict(db: ReturnType<typeof createSupabaseAdmin>, G: 'M' | 'F', ids: number[], every = false): Promise<string | null> {
  type Line = { seasons?: string[]; names?: string[]; bySeason?: { season: string; school: string }[] }
  type J = { id: number; decision: string; a_season: number; a_name: string; a_team: string; a_school: number | null; b_season: number; b_name: string; b_team: string; b_school: number | null; b_wrestler_id: string | null; context: { a?: Line; b?: Line & { ours?: { season: string; schools?: string[] }[]; graduation_year?: number | null } } }
  const js = await all<J>((f, t) => db.from('playoff_history_joins').select('id, decision, a_season, a_name, a_team, a_school, b_season, b_name, b_team, b_school, b_wrestler_id, context').eq('gender', G).order('id').range(f, t))
  const use = js.filter(j => j.decision === 'same' || ids.includes(j.id))
  const end = (l: string) => Number(l.slice(0, 4)) + 1
  const parent = new Map<string, string>()
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r }
  // a history line is known by its school, its seasons and its names (a maybe can name it by its first or its last
  // season, so the season alone doesn't identify it; two wrestlers can share a school and seasons)
  const lineKey = (school: number | null, l?: Line) => `L|${school}|${(l?.seasons ?? []).join(',')}|${[...(l?.names ?? [])].map(n => n.toLowerCase().replace(/[^a-z]/g, '')).sort().join('/')}`
  const aKey = (j: J) => lineKey(j.a_school, j.context.a), bKey = (j: J) => (j.b_wrestler_id ? `P|${j.b_wrestler_id}` : lineKey(j.b_school, j.context.b))
  for (const j of use) parent.set(find(bKey(j)), find(aKey(j)))
  const groups = new Map<string, { seasons: Set<number>; profiles: Set<string>; names: Set<string>; grads: Set<number>; lines: Map<string, Set<number>> }>()
  for (const j of use) {
    const g = groups.get(find(aKey(j))) ?? groups.set(find(aKey(j)), { seasons: new Set(), profiles: new Set(), names: new Set(), grads: new Set(), lines: new Map() }).get(find(aKey(j)))!
    // each line's seasons: one wrestler can't be on two lines (two schools) in the same season
    const addLine = (key: string, ls: string[]) => { const s = g.lines.get(key) ?? g.lines.set(key, new Set()).get(key)!; for (const l of ls) { s.add(end(l)); g.seasons.add(end(l)) } }
    addLine(aKey(j), j.context.a?.seasons ?? [])
    addLine(bKey(j), [...(j.context.b?.seasons ?? []), ...(j.context.b?.ours ?? []).map(o => o.season)])
    if (j.b_wrestler_id) g.profiles.add(j.b_wrestler_id)
    if (j.context.b?.graduation_year) g.grads.add(j.context.b.graduation_year)
    g.names.add(j.a_name); g.names.add(j.b_name)
  }
  const mine = new Set(use.filter(j => ids.includes(j.id)).map(j => find(aKey(j))))
  const found: string[] = []
  const report = (m: string) => { if (!every) return m; found.push(m); return null }
  for (const [root, g] of groups) {
    if (!every && !mine.has(root)) continue
    const ys = [...g.seasons], lbl = (y: number) => `${y - 1}-${String(y).slice(2)}`
    const who = [...g.names].join(' / ')
    const perSeason = new Map<number, number>()
    for (const ss of g.lines.values()) for (const y of ss) perSeason.set(y, (perSeason.get(y) ?? 0) + 1)
    const twice = [...perSeason].filter(([, n]) => n > 1).map(([y]) => y)
    if (twice.length) { const r = report(`${who}: with your other “Same” calls this wrestler would be on two lines (two schools or two weights) in ${twice.sort().map(lbl).join(', ')} — mark one of them Different`); if (r) return r; continue }
    if (g.profiles.size > 1) { const r = report(`${who}: this would join ${g.profiles.size} different existing profiles into one wrestler — mark one of them Different first`); if (r) return r; continue }
    if (ys.length && Math.max(...ys) - Math.min(...ys) > 3) { const r = report(`${who}: with your other “Same” calls this wrestler would run ${lbl(Math.min(...ys))} to ${lbl(Math.max(...ys))} — more than four seasons`); if (r) return r; continue }
    const grad = [...g.grads][0]
    if (grad != null && ys.some(y => y > grad || y < grad - 3)) { const r = report(`${who}: seasons ${ys.sort().map(lbl).join(', ')} don’t fit the class of ${grad}`); if (r) return r }
  }
  return every && found.length ? found.join('\n') : null
}
