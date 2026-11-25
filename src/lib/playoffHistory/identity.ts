// Playoff History: who is who (Kyle 2026-11-13), run from the review tool (server; the staged data is in the database).
//   personSeasons — each staged entry → a person in one season: normalized name + school (playoff_history_schools)
//   findCandidates — what may be the same wrestler but isn't automatic → playoff_history_joins (Kyle's calls kept)
//   assignPeople — once nothing is pending: every entry gets its wrestler (existing profile or a new one)
// Automatic (Kyle's rule): the same name at the same school within four seasons — back-to-back or across a skipped
// postseason (2026-11-14); and a history wrestler with
// exactly one existing profile of the same name that wrestled at the same school, class year fitting. A run longer than
// four seasons is cut for review (two wrestlers of one name).
import type { SupabaseClient } from '@supabase/supabase-js'
import { normName, splitName, sameFirst } from './people'

type G = 'M' | 'F'
export type PersonSeason = { key: string; season: number; norm: string; school: number; names: string[]; teams: string[]; weights: number[]; places: string[]; entryIds: number[] }
type Chain = PersonSeason[]

async function all<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}
const lbl = (y: number) => `${y - 1}-${String(y).slice(2)}`

export async function personSeasons(db: SupabaseClient, g: G) {
  const names = new Map((await all<{ raw_name: string; school_id: number | null }>((f, t) => db.from('playoff_history_schools').select('raw_name, school_id').eq('gender', g).order('raw_name').range(f, t))).map(r => [r.raw_name, r.school_id]))
  const ents = await all<{ id: number; season_id: number; kind: string; num: number | null; weight: number; name: string; team: string; place: number | null }>((f, t) =>
    db.from('playoff_history_entrants').select('id, season_id, kind, num, weight, name, team, place').eq('gender', g).order('id').range(f, t))
  const ps = new Map<string, PersonSeason>()
  for (const e of ents) {
    const school = names.get(e.team)
    if (school == null) continue   // an empty slot (TrackWrestling placeholder team)
    const key = `${e.season_id}|${normName(e.name)}|${school}`
    const p = ps.get(key) ?? ps.set(key, { key, season: e.season_id, norm: normName(e.name), school, names: [], teams: [], weights: [], places: [], entryIds: [] }).get(key)!
    if (!p.names.includes(e.name)) p.names.push(e.name)
    if (!p.teams.includes(e.team)) p.teams.push(e.team)
    if (!p.weights.includes(e.weight)) p.weights.push(e.weight)
    p.places.push(`${e.kind === 'state' ? 'State' : e.kind === 'region' ? `Region ${g === 'F' ? ({ 1: 'North I', 2: 'North II', 3: 'Central', 4: 'South', 5: 'North' } as Record<number, string>)[e.num ?? 0] ?? e.num : e.num}` : `District ${e.num}`} ${e.weight} · ${e.place ? `${e.place}${['th', 'st', 'nd', 'rd'][e.place] ?? 'th'}` : 'entered'}`)
    p.entryIds.push(e.id)
  }
  // automatic runs: same name + school within four seasons — back-to-back, or across a skipped postseason (Kyle
  // 2026-11-14: "Merge them"); a run is cut once it would pass four seasons
  const groups = new Map<string, PersonSeason[]>()
  for (const p of ps.values()) (groups.get(`${p.norm}|${p.school}`) ?? groups.set(`${p.norm}|${p.school}`, []).get(`${p.norm}|${p.school}`)!).push(p)
  const chains: Chain[] = [], longCuts: [PersonSeason, PersonSeason][] = []
  for (const list of groups.values()) {
    list.sort((a, b) => a.season - b.season)
    let cur: Chain = []
    for (const p of list) {
      const prev = cur[cur.length - 1]
      if (prev && p.season - cur[0].season > 3) { if (p.season - prev.season === 1) longCuts.push([prev, p]); chains.push(cur); cur = [] }
      cur.push(p)
    }
    chains.push(cur)
  }
  return { ps, chains, longCuts }
}

// existing profiles: name → profiles; a profile's schools = name links + postseason entries + dual bouts
async function profiles(db: SupabaseClient, g: G) {
  const ws = await all<{ id: string; first_name: string; last_name: string; graduation_year: number | null }>((f, t) => db.from('wrestlers').select('id, first_name, last_name, graduation_year').eq('gender', g).order('id').range(f, t))
  const { data: made } = await db.from('playoff_history_profiles').select('wrestler_id').eq('gender', g).eq('created', true)
  const ours = new Set((made ?? []).map(r => r.wrestler_id))   // profiles this import made aren't "existing"
  const byId = new Map(ws.filter(w => !ours.has(w.id)).map(w => [w.id, w]))
  const schools = new Map<string, Set<number>>()
  // what we have on each profile: season → weights and schools (postseason entries, duals) — shown beside a candidate
  const seasons = new Map<string, Map<number, { weights: Set<number>; schools: Set<number>; finishes: string[] }>>()
  const add = (w: string | null, s: number | null) => { if (w && s != null && byId.has(w)) (schools.get(w) ?? schools.set(w, new Set()).get(w)!).add(s) }
  const saw = (w: string | null, season: number | null | undefined, weight: number | null | undefined, school: number | null) => {
    if (!w || !season || !byId.has(w)) return
    const m = seasons.get(w) ?? seasons.set(w, new Map()).get(w)!
    const x = m.get(season) ?? m.set(season, { weights: new Set(), schools: new Set(), finishes: [] }).get(season)!
    if (weight) x.weights.add(weight); if (school != null) x.schools.add(school)
  }
  for (const a of await all<{ wrestler_id: string; school_id: number | null }>((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id').order('id').range(f, t))) add(a.wrestler_id, a.school_id)
  const tours = await all<{ id: number; season_id: number; name: string; tournament_type: string }>((f, t) => db.from('tournaments').select('id, season_id, name, tournament_type').eq('gender', g).order('id').range(f, t))
  const tSeason = new Map(tours.map(x => [x.id, x.season_id]))
  // each entry's finish: placement bouts (final 1/2, 3rd 3/4, 5th 5/6, 7th 7/8); otherwise "entered"
  const GIRLS_R: Record<string, string> = { r1: 'North I', r2: 'North II', r3: 'Central', r4: 'South' }
  const tLabel = new Map(tours.map(x => [x.id, x.tournament_type.includes('state') ? 'State' : x.tournament_type === 'districts' ? x.name.replace(/^.*District /, 'District ')
    : `Region ${g === 'F' ? GIRLS_R[x.name.replace(/^.*Regions /, '')] ?? x.name.replace(/^.*Regions r/, '') : x.name.replace(/^.*Regions r/, '')}`]))
  const placeOf = new Map<string, number>()
  const ROUND: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }
  for (let i = 0; i < tours.length; i += 40) {
    const { data, error } = await db.from('matches').select('round, bracket_side, winner_entry_id, loser_entry_id').in('tournament_id', tours.slice(i, i + 40).map(x => x.id)).in('round', Object.keys(ROUND))
    if (error) throw new Error(error.message)
    for (const m of data ?? []) {
      if (m.round === 'F' && m.bracket_side !== 'championship') continue
      const p = ROUND[m.round]
      if (m.winner_entry_id) placeOf.set(m.winner_entry_id, p)
      if (m.loser_entry_id) placeOf.set(m.loser_entry_id, p + 1)
    }
  }
  const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`
  const wc = new Map((await all<{ id: number; weight: number }>((f, t) => db.from('weight_classes').select('id, weight').order('id').range(f, t))).map(x => [x.id, x.weight]))
  for (const e of await all<{ id: string; wrestler_id: string | null; school_id: number | null; tournament_id: number; weight_class_id: number | null }>((f, t) => db.from('tournament_entries').select('id, wrestler_id, school_id, tournament_id, weight_class_id').order('id').range(f, t))) {
    add(e.wrestler_id, e.school_id); saw(e.wrestler_id, tSeason.get(e.tournament_id), e.weight_class_id ? wc.get(e.weight_class_id) : null, e.school_id)
    const se = tSeason.get(e.tournament_id)
    if (e.wrestler_id && se && byId.has(e.wrestler_id)) {
      const p = placeOf.get(e.id), w = e.weight_class_id ? wc.get(e.weight_class_id) : null
      seasons.get(e.wrestler_id)?.get(se)?.finishes.push(`${tLabel.get(e.tournament_id)}${w ? ` ${w}` : ''} · ${p ? ord(p) : 'entered'}`)
    }
  }
  const meetSeason = new Map((await all<{ id: string; season_id: number }>((f, t) => db.from(g === 'F' ? 'dual_meets_girls' : 'dual_meets').select('id, season_id').order('id').range(f, t))).map(x => [x.id, x.season_id]))
  for (const m of await all<{ dual_meet_id: string; weight_class: string | number | null; wrestler_a_id: string | null; wrestler_b_id: string | null; school_a_id: number | null; school_b_id: number | null }>((f, t) =>
    db.from(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))) {
    add(m.wrestler_a_id, m.school_a_id); add(m.wrestler_b_id, m.school_b_id)
    const se = meetSeason.get(m.dual_meet_id), w = Number.parseInt(String(m.weight_class ?? '')) || null
    saw(m.wrestler_a_id, se, w, m.school_a_id); saw(m.wrestler_b_id, se, w, m.school_b_id)
  }
  const byNorm = new Map<string, { id: string; first_name: string; last_name: string; graduation_year: number | null }[]>()
  for (const w of byId.values()) { const k = normName(`${w.first_name} ${w.last_name}`); (byNorm.get(k) ?? byNorm.set(k, []).get(k)!).push(w) }
  return { byNorm, schools, seasons }
}
// Four years of eligibility (Kyle 2026-11-14): everything joined into one wrestler — history seasons and ours — must fit
// four consecutive seasons, and with a class year, run from three seasons before it through it (class of 2028: 2025-2028).
export function window4(seasons: number[], grad: number | null): { ok: boolean; why: string | null; first: number; last: number } {
  const first = Math.min(...seasons), last = Math.max(...seasons)
  const why = last - first > 3 ? `${lbl(first)} to ${lbl(last)} is ${last - first + 1} seasons`
    : grad != null && last > grad ? `${lbl(last)} is after the class of ${grad} graduated`
    : grad != null && first < grad - 3 ? `${lbl(first)} is more than four seasons before the class of ${grad} graduates`
    : null
  return { ok: !why, why, first, last }
}

/** Existing profile for a chain: automatic when exactly one same-named profile wrestled at the chain's school and its class fits. */
function existingFor(c: Chain, P: Awaited<ReturnType<typeof profiles>>) {
  const last = c[c.length - 1]
  const cands = P.byNorm.get(last.norm) ?? []
  const fits = (w: { id: string; graduation_year: number | null }) => window4([...c.map(p => p.season), ...(P.seasons.get(w.id)?.keys() ?? [])], w.graduation_year).ok
  const here = cands.filter(w => P.schools.get(w.id)?.has(last.school))
  if (here.length === 1 && fits(here[0])) return { auto: here[0].id, review: [] as typeof cands }
  // the rest that could be the same wrestler: same school (window broken → flagged), or another school whose class or
  // seasons come within reach of the history (graduates after it, starts no later than four seasons on)
  const elsewhere = cands.filter(w => !P.schools.get(w.id)?.has(last.school) && (w.graduation_year == null ? [...(P.seasons.get(w.id)?.keys() ?? [])].some(y => y - c[0].season <= 4) : w.graduation_year > last.season && w.graduation_year - c[0].season <= 5))
  return { auto: null, review: [...here, ...elsewhere] }
}

export async function findCandidates(db: SupabaseClient, g: G) {
  const { chains, longCuts } = await personSeasons(db, g)
  const P = await profiles(db, g)
  const { data: sch } = await db.from('schools').select('id, display_name')
  const sn = new Map((sch ?? []).map(s => [s.id as number, s.display_name as string]))
  // our data on a profile: each season's weight(s) and school, and the gap after the history's last season
  const ourSide = (id: string, grad: number | null, ps: number[], histLast: number) => {
    const by = [...(P.seasons.get(id) ?? new Map())].sort((x, y) => x[0] - y[0])
    const first = by[0]?.[0]
    const missing = first ? Array.from({ length: Math.max(0, first - histLast - 1) }, (_, i) => lbl(histLast + 1 + i)) : []
    return {
      profile: true, graduation_year: grad, schools: ps.map(i => sn.get(i) ?? `#${i}`),
      ours: by.map(([y, x]) => ({ season: lbl(y), weights: [...x.weights].sort((p, q) => p - q), schools: [...x.schools].map(i => sn.get(i) ?? `#${i}`), finishes: x.finishes })),
      gap: first == null ? null : first <= histLast ? 'overlap' : missing.length ? missing : [],
    }
  }
  // a history line that joins one of our profiles on its own says so (Kyle 2026-11-14: Sean Brown's Newton line was
  // already joined, so he looked for it among the maybes)
  const autoOf = (c: Chain) => { const id = existingFor(c, P).auto; if (!id) return null; const w = [...P.byNorm.values()].flat().find(x => x.id === id)!; return { id, name: `${w.first_name} ${w.last_name}`, graduation_year: w.graduation_year, schools: [...(P.schools.get(id) ?? [])].map(i => sn.get(i) ?? `#${i}`) } }
  const side = (c: Chain | PersonSeason[]) => ({ auto: chains.includes(c as Chain) ? autoOf(c as Chain) : null, bySeason: c.map(p => ({ season: lbl(p.season), weights: p.weights, school: sn.get(p.school) ?? `#${p.school}`, finishes: p.places })), seasons: c.map(p => lbl(p.season)), schools: [...new Set(c.map(p => sn.get(p.school) ?? `#${p.school}`))], weights: c.map(p => p.weights.join('/')), places: c.flatMap(p => p.places.map(x => `${lbl(p.season)} ${x}`)), names: [...new Set(c.flatMap(p => p.names))] })
  const rows: Record<string, unknown>[] = []
  const pair = (a: PersonSeason, b: PersonSeason, reason: string, ca: Chain, cb: Chain) => rows.push({
    gender: g, a_season: a.season, a_name: a.names[0], a_team: a.teams[0], a_school: a.school, b_season: b.season, b_name: b.names[0], b_team: b.teams[0], b_school: b.school, reason,
    context: { a: side(ca), b: side(cb), window: window4([...ca, ...cb].map(p => p.season), null), jump: jump(a.season, a.weights[a.weights.length - 1], b.season, b.weights[0]) },
  })
  // weight-class jump between two seasons (Kyle 2026-11-14): positions in each season's own class list, since the
  // classes changed (152 → 150 in 2021-22): "138 → 145, up 1"
  const classes = new Map<number, number[]>()
  for (const p of (await personSeasons(db, g)).ps.values()) { const l = classes.get(p.season) ?? classes.set(p.season, []).get(p.season)!; for (const w of p.weights) if (!l.includes(w)) l.push(w) }
  // our seasons' classes, from every profile's weights (2024-25 on)
  for (const m of P.seasons.values()) for (const [y, x] of m) { const l = classes.get(y) ?? classes.set(y, []).get(y)!; for (const w of x.weights) if (!l.includes(w)) l.push(w) }
  for (const l of classes.values()) l.sort((x, y) => x - y)
  const jump = (fromSeason: number, fromW: number, toSeason: number, toW: number) => {
    const a = classes.get(fromSeason)?.indexOf(fromW) ?? -1, b = classes.get(toSeason)?.indexOf(toW) ?? -1
    if (a < 0 || b < 0) return null
    const d = b - a
    return { from: fromW, to: toW, classes: d, text: `${fromW} → ${toW}, ${d === 0 ? 'same class' : `${d > 0 ? 'up' : 'down'} ${Math.abs(d)} class${Math.abs(d) === 1 ? '' : 'es'}`}` }
  }
  const endsIn = new Map<number, Chain[]>()
  for (const c of chains) { const y = c[c.length - 1].season; (endsIn.get(y) ?? endsIn.set(y, []).get(y)!).push(c) }
  const first = (n: string) => n.split(' ')[0], last = (n: string) => n.split(' ').slice(-1)[0]
  for (const c of chains) {
    const s = c[0]
    for (const prev of endsIn.get(s.season - 1) ?? []) {
      const p = prev[prev.length - 1]
      if (p.norm === s.norm && p.school !== s.school) pair(p, s, 'transfer', prev, c)
      else if (p.school === s.school && p.norm !== s.norm && last(p.norm) === last(s.norm) && sameFirst(first(p.norm), first(s.norm))) pair(p, s, 'name variant', prev, c)
    }
  }
  for (const [a, b] of longCuts) pair(a, b, 'more than four seasons', chains.find(c => c.includes(a))!, chains.find(c => c.includes(b))!)
  // existing profiles that aren't automatic
  for (const c of chains) {
    const x = existingFor(c, P)
    for (const w of x.review) {
      const ps = [...(P.schools.get(w.id) ?? [])]
      rows.push({
        gender: g, a_season: c[c.length - 1].season, a_name: c[c.length - 1].names[0], a_team: c[c.length - 1].teams[0], a_school: c[c.length - 1].school,
        b_season: w.graduation_year ?? 0, b_name: `${w.first_name} ${w.last_name}`, b_team: ps.map(i => sn.get(i)).join(' / ') || '—', b_school: ps[0] ?? null, b_wrestler_id: w.id,
        reason: P.schools.get(w.id)?.has(c[c.length - 1].school) ? 'existing profile, class year off' : 'existing profile, other school',
        context: {
          a: side(c), b: ourSide(w.id, w.graduation_year, ps, c[c.length - 1].season), window: window4([...c.map(p => p.season), ...(P.seasons.get(w.id)?.keys() ?? [])], w.graduation_year),
          jump: (() => {   // last history weight → first weight with us
            const ours = [...(P.seasons.get(w.id) ?? new Map())].sort((x, y) => x[0] - y[0])[0]
            const lastP = c[c.length - 1]
            return ours && ours[1].weights.size ? jump(lastP.season, lastP.weights[lastP.weights.length - 1], ours[0], Math.min(...ours[1].weights)) : null
          })(),
        },
      })
    }
  }
  // write: new candidates only; Kyle's calls stay
  const { data: have } = await db.from('playoff_history_joins').select('a_season, a_name, a_team, b_season, b_name, b_team').eq('gender', g)
  const k = (r: Record<string, unknown>) => [r.a_season, r.a_name, r.a_team, r.b_season, r.b_name, r.b_team].join('|')
  const seen = new Set((have ?? []).map(k))
  const already = new Set(seen)
  const fresh = rows.filter(r => { const key = k(r); if (seen.has(key)) return false; seen.add(key); return true })
  // rows already there keep Kyle's call; their context is refreshed (what we show beside them improves)
  const { data: ids } = await db.from('playoff_history_joins').select('id, a_season, a_name, a_team, b_season, b_name, b_team').eq('gender', g)
  const idOf = new Map((ids ?? []).map(r => [k(r), r.id as number]))
  for (const r of rows) if (already.has(k(r)) && idOf.has(k(r))) await db.from('playoff_history_joins').update({ context: r.context }).eq('id', idOf.get(k(r))!)
  for (let i = 0; i < fresh.length; i += 500) { const { error } = await db.from('playoff_history_joins').insert(fresh.slice(i, i + 500)); if (error) throw new Error(error.message) }
  const count: Record<string, number> = {}; for (const r of rows) count[r.reason as string] = (count[r.reason as string] ?? 0) + 1
  return { found: rows.length, added: fresh.length, by_reason: count }
}

/** Every staged entry → its wrestler. Needs every candidate decided. Existing profiles are linked; the rest get new
 *  profiles (inactive, first/last split from the export's name). Writes playoff_history_entrants.wrestler_id and
 *  playoff_history_profiles. Safe to run again: entries already assigned keep their wrestler. */
export async function assignPeople(db: SupabaseClient, g: G, dryRun = false) {
  const { count: pending } = await db.from('playoff_history_joins').select('*', { count: 'exact', head: true }).eq('gender', g).eq('decision', 'pending')
  if (pending) throw new Error(`${pending} same-wrestler decisions still pending`)
  const { ps, chains } = await personSeasons(db, g)
  const P = await profiles(db, g)
  const joins = await all<{ a_season: number; a_name: string; a_school: number; b_season: number; b_name: string; b_school: number | null; b_wrestler_id: string | null; decision: string }>((f, t) =>
    db.from('playoff_history_joins').select('a_season, a_name, a_school, b_season, b_name, b_school, b_wrestler_id, decision').eq('gender', g).eq('decision', 'same').order('id').range(f, t))
  // union-find over chains
  const chainOf = new Map<string, number>(); chains.forEach((c, i) => c.forEach(p => chainOf.set(p.key, i)))
  const parent = chains.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const profileOf = new Map<number, string>()   // root chain → existing wrestler id
  const psKey = (season: number, name: string, school: number) => `${season}|${normName(name)}|${school}`
  for (const j of joins) {
    const a = chainOf.get(psKey(j.a_season, j.a_name, j.a_school))
    if (a == null) continue
    if (j.b_wrestler_id) { profileOf.set(find(a), j.b_wrestler_id); continue }
    const b = j.b_school != null ? chainOf.get(psKey(j.b_season, j.b_name, j.b_school)) : undefined
    if (b != null) { const ra = find(a), rb = find(b); if (ra !== rb) { parent[rb] = ra; if (profileOf.has(rb) && !profileOf.has(ra)) profileOf.set(ra, profileOf.get(rb)!) } }
  }
  chains.forEach((c, i) => { const x = existingFor(c, P); if (x.auto && !profileOf.has(find(i))) profileOf.set(find(i), x.auto) })
  // entries already assigned keep their wrestler (a rerun after a load)
  const done = new Map<number, string>()
  for (const e of await all<{ id: number; wrestler_id: string | null }>((f, t) => db.from('playoff_history_entrants').select('id, wrestler_id').eq('gender', g).not('wrestler_id', 'is', null).order('id').range(f, t))) done.set(e.id, e.wrestler_id!)
  const roots = new Map<number, PersonSeason[]>()
  chains.forEach((c, i) => { const r = find(i); (roots.get(r) ?? roots.set(r, []).get(r)!).push(...c) })
  // four years of eligibility: a wrestler made of more than four seasons is a wrong "same" (Kyle 2026-11-14)
  // and no wrestler on two lines in one season; with a profile, inside its class year
  const gradOf = (id: string) => [...P.byNorm.values()].flat().find(w => w.id === id)?.graduation_year ?? null
  const bad: string[] = []
  for (const [root, ppl] of roots) {
    const prof = profileOf.get(root)
    const ys = [...ppl.map(p => p.season), ...(prof ? [...(P.seasons.get(prof)?.keys() ?? [])] : [])]
    const w = window4(ys, prof ? gradOf(prof) : null)
    const twice = [...new Set(ppl.map(p => p.season).filter((y, i, a) => a.indexOf(y) !== i))]
    if (!w.ok || twice.length) bad.push(`${ppl[0].names[0]} (${twice.length ? `two lines in ${twice.map(lbl).join(', ')}` : w.why})`)
  }
  if (bad.length) throw new Error(`these "same" decisions don't make one possible wrestler — mark one Different: ${bad.slice(0, 10).join('; ')}`)
  let linked = 0
  const groups: { people: PersonSeason[]; wid: string | null; prior: boolean; raw: string }[] = []
  for (const [root, people] of roots) {
    const prior = people.flatMap(p => p.entryIds).map(id => done.get(id)).find(Boolean) ?? null
    const counts = new Map<string, number>(); for (const p of people) for (const nm of p.names) counts.set(nm, (counts.get(nm) ?? 0) + 1)
    groups.push({ people, wid: prior ?? profileOf.get(root) ?? null, prior: !!prior, raw: [...counts].sort((x, y) => y[1] - x[1])[0][0] })
  }
  // new profiles, 500 at a time (inserted rows come back in order)
  const fresh = groups.filter(x => !x.wid)
  if (dryRun) return { people: roots.size, created: fresh.length, linked: groups.filter(x => x.wid && !x.prior).length, entries: groups.reduce((n, x) => n + x.people.reduce((m, p) => m + p.entryIds.filter(id => !done.has(id)).length, 0), 0), dryRun: true }
  for (let i = 0; i < fresh.length; i += 500) {
    const batch = fresh.slice(i, i + 500)
    const { data, error } = await db.from('wrestlers').insert(batch.map(x => { const nm = splitName(x.raw); return { first_name: nm.first, last_name: nm.last, suffix: nm.suffix, gender: g, is_active: false, is_oos: false } })).select('id')
    if (error) throw new Error(`new profiles: ${error.message}`)
    batch.forEach((x, j) => { x.wid = data![j].id as string })
  }
  const profileRows: Record<string, unknown>[] = []
  for (const x of groups) {
    if (x.prior) continue
    const seasons = x.people.map(p => p.season)
    if (!fresh.includes(x)) linked++
    profileRows.push({ wrestler_id: x.wid, gender: g, created: fresh.includes(x), first_season: Math.min(...seasons), last_season: Math.max(...seasons) })
  }
  for (let i = 0; i < profileRows.length; i += 500) { const { error } = await db.from('playoff_history_profiles').upsert(profileRows.slice(i, i + 500), { onConflict: 'wrestler_id', ignoreDuplicates: true }); if (error) throw new Error(error.message) }
  // entrants → wrestler: whole rows upserted 1,000 at a time (an upsert must carry every required column)
  const widOf = new Map<number, string>(); for (const x of groups) for (const p of x.people) for (const id of p.entryIds) if (!done.has(id)) widOf.set(id, x.wid!)
  const rowsAll = await all<Record<string, unknown>>((f, t) => db.from('playoff_history_entrants').select('*').eq('gender', g).order('id').range(f, t))
  const upd = rowsAll.filter(r => widOf.has(r.id as number)).map(r => ({ ...r, wrestler_id: widOf.get(r.id as number) }))
  for (let i = 0; i < upd.length; i += 1000) { const { error } = await db.from('playoff_history_entrants').upsert(upd.slice(i, i + 1000), { onConflict: 'id' }); if (error) throw new Error(error.message) }
  const n = upd.length, created = fresh.length
  void ps
  return { people: roots.size, created, linked, entries: n }
}
