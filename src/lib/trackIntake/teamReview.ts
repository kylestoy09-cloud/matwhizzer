// School Data Review (preseason step 1, Kyle 2026-11-28): each team on Track's season Teams page matched to our school
// and checked against what we hold for that season — district and region (the point of the step), plus Track's
// names and abbreviation, which are saved as aliases so the roster and schedule imports match by them. A Track team
// we don't have is a new school ("we also need to be prepared to see new schools overall").
// Server only (service role). Boys and girls are separate: every table here is the side's own.
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { looseName, isTestTeam, type TrackTeam } from './teams'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, any, any>
export type Side = 'boys' | 'girls'

export type StoredTeam = {
  season_id: number; season_name: string; global_name: string; state: string; abbr: string | null; gov_body: string | null
  leagues: string[]; school_id: number | null; status: 'pending' | 'confirmed' | 'skipped' | 'added'; note: string | null
  reviewed_at: string | null; reviewed_by: string | null; first_seen: string
}

// stale: Track's value is what we had last season (Track hadn't loaded the 2026-27 alignment on 2026-11-28: its
// districts matched our 2025-26 ones for all 47 matched schools, our 2026-27 ones for 14) — shown, not to settle
export type Diff = { field: 'district' | 'region'; ours: number | null; track: number[]; last: number | null; stale: boolean }
export type ReviewRow = {
  key: string                       // season_name|global_name
  team: TrackTeam
  status: StoredTeam['status']
  note: string | null
  schoolId: number | null
  how: 'reviewed' | 'name' | 'abbreviation' | 'close name' | 'co-op part' | null   // how the school was found ('name' alone is certain enough to confirm in bulk)
  noProgram: boolean                // the school is ours, but not (yet) a program on this side
  ourName: string | null
  diffs: Diff[]                     // district / region disagreements (Kyle settles these)
  info: string[]                    // things to know, not to settle (Track's other leagues vs our conference, county)
  newAliases: string[]              // Track names / abbreviation we'd save for this school
  aliasClash: string[]              // a Track name we can't save: it already names another school
  suggestions: { id: number; name: string }[]
  firstSeen: string | null          // when this Track team first appeared (a round-2 addition shows a later date)
  skipHint: string | null           // why it looks like something to skip
}

export type OurData = {
  schools: Map<number, { id: number; name: string; county: string | null }>
  programs: Set<number>             // this side's programs
  inactive: Set<number>             // programs marked inactive this season
  district: Map<number, number>
  region: Map<number, number>
  lastDistrict: Map<number, number>          // the season before (to tell a stale Track value from a real difference)
  lastRegion: Map<number, number>
  conference: Map<number, string>
  aliasByLower: Map<string, { schoolId: number; alias: string; type: string | null }>
  namesBySchool: Map<number, Set<string>>      // every name and alias we know a school by (lower case)
}

const keyOf = (t: { seasonName: string; globalName: string }) => `${t.seasonName}|${t.globalName}`

export async function loadOurData(db: Db, side: Side, seasonId: number): Promise<OurData> {
  const g = side === 'boys' ? 'M' : 'F'
  const [schools, programs, inactive, districts, regions, confs, names, aliases, lastD, lastR] = await Promise.all([
    fetchAllRows<{ id: number; display_name: string; county: string | null; is_nj: boolean }>((f, t) => db.from('schools').select('id, display_name, county, is_nj').eq('is_nj', true).order('id').range(f, t)),
    fetchAllRows<{ school_id: number }>((f, t) => db.from(`${side}_schools`).select('school_id').order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number }>((f, t) => db.from('inactive_school_seasons').select('school_id').eq('season_id', seasonId).eq('gender', g).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number; district_id: number }>((f, t) => db.from(`${side}_school_districts`).select('school_id, district_id').eq('season_id', seasonId).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number; region_id: number }>((f, t) => db.from(`${side}_school_regions`).select('school_id, region_id').eq('season_id', seasonId).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number; conference: string }>((f, t) => db.from(`${side}_school_conferences`).select('school_id, conference').eq('season_id', seasonId).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number; display_name: string }>((f, t) => db.from('school_season_names').select('school_id, display_name').eq('season_id', seasonId).eq('gender', g).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number | null; alias: string; alias_type: string | null }>((f, t) => db.from('school_aliases').select('school_id, alias, alias_type').order('id').range(f, t)),
    fetchAllRows<{ school_id: number; district_id: number }>((f, t) => db.from(`${side}_school_districts`).select('school_id, district_id').eq('season_id', seasonId - 1).order('school_id').range(f, t)),
    fetchAllRows<{ school_id: number; region_id: number }>((f, t) => db.from(`${side}_school_regions`).select('school_id, region_id').eq('season_id', seasonId - 1).order('school_id').range(f, t)),
  ])
  for (const r of [schools, programs, inactive, districts, regions, confs, names, aliases, lastD, lastR]) if (r.error) throw new Error(r.error.message)
  const out: OurData = {
    schools: new Map((schools.data ?? []).map(s => [s.id, { id: s.id, name: s.display_name, county: s.county }])),
    programs: new Set((programs.data ?? []).map(p => p.school_id)),
    inactive: new Set((inactive.data ?? []).map(p => p.school_id)),
    district: new Map((districts.data ?? []).map(r => [r.school_id, r.district_id])),
    region: new Map((regions.data ?? []).map(r => [r.school_id, r.region_id])),
    conference: new Map((confs.data ?? []).map(r => [r.school_id, r.conference])),
    lastDistrict: new Map((lastD.data ?? []).map(r => [r.school_id, r.district_id])),
    lastRegion: new Map((lastR.data ?? []).map(r => [r.school_id, r.region_id])),
    aliasByLower: new Map(),
    namesBySchool: new Map(),
  }
  const know = (id: number, n: string) => { if (!out.namesBySchool.has(id)) out.namesBySchool.set(id, new Set()); out.namesBySchool.get(id)!.add(n.toLowerCase()) }
  for (const s of out.schools.values()) know(s.id, s.name)
  for (const n of names.data ?? []) if (out.schools.has(n.school_id)) know(n.school_id, n.display_name)
  for (const a of aliases.data ?? []) {
    out.aliasByLower.set(a.alias.toLowerCase(), { schoolId: a.school_id ?? -1, alias: a.alias, type: a.alias_type })
    if (a.school_id != null && a.alias_type !== 'oos' && out.schools.has(a.school_id)) know(a.school_id, a.alias)
  }
  return out
}

/** one Track team against our data */
export function reviewTeam(team: TrackTeam, stored: StoredTeam | null, our: OurData): ReviewRow {
  const row: ReviewRow = {
    key: keyOf(team), team, status: stored?.status ?? 'pending', note: stored?.note ?? null, schoolId: null, how: null, ourName: null, noProgram: false,
    diffs: [], info: [], newAliases: [], aliasClash: [], suggestions: [], firstSeen: stored?.first_seen ?? null,
    skipHint: isTestTeam(team) ? 'A Track test team' : team.state && team.state !== 'NJ' ? `Out of state (${team.state})` : team.govBody && team.govBody !== 'NJSIAA' ? `Governed by ${team.govBody}, not the NJSIAA` : null,
  }
  // the school: one we settled before, else one school known by exactly this name, else by the abbreviation, else by
  // the same name once punctuation, "High School", "Regional", "Township" are dropped
  const byName = (n: string) => { const ids = new Set<number>(); for (const [id, ns] of our.namesBySchool) if (ns.has(n.toLowerCase())) ids.add(id); return ids }
  // one school, or among several the one that's a program on this side
  const one = (ids: Set<number>) => { if (ids.size === 1) return [...ids][0]; const p = [...ids].filter(i => our.programs.has(i)); return p.length === 1 ? p[0] : null }
  let id: number | null = stored?.school_id ?? null
  if (id != null) row.how = 'reviewed'
  // the season name first: a co-op's global name is one member ("Chatham/Mendham", global "Chatham"; our program is Mendham)
  if (id == null) { id = one(byName(team.seasonName)); if (id != null) row.how = 'name' }
  if (id == null && !team.seasonName.includes('/')) { id = one(byName(team.globalName)); if (id != null) row.how = 'name' }
  if (id == null && team.abbr) { const a = our.aliasByLower.get(team.abbr.toLowerCase()); if (a && a.type === 'abbreviation' && our.schools.has(a.schoolId)) { id = a.schoolId; row.how = 'abbreviation' } }
  if (id == null) {
    const want = new Set(team.seasonName.includes('/') ? [looseName(team.seasonName)] : [looseName(team.seasonName), looseName(team.globalName)])
    const ids = new Set<number>()
    for (const [sid, ns] of our.namesBySchool) for (const n of ns) if (want.has(looseName(n))) ids.add(sid)
    id = one(ids); if (id != null) row.how = 'close name'
  }
  if (id == null && team.seasonName.includes('/')) {
    // a co-op: the member that's a program on this side
    const ids = new Set<number>()
    for (const part of team.seasonName.split('/').map(x => x.trim()).filter(Boolean)) for (const i of byName(part)) if (our.programs.has(i)) ids.add(i)
    if (ids.size === 1) { id = [...ids][0]; row.how = 'co-op part' }
  }
  if (id == null) {
    // suggestions: schools sharing the most words with Track's names
    const words = new Set(`${looseName(team.seasonName)} ${looseName(team.globalName)}`.split(' ').filter(w => w.length > 2))
    const scored = [...our.schools.values()].map(s => ({ s, n: [...new Set(looseName(s.name).split(' '))].filter(w => words.has(w)).length })).filter(x => x.n > 0)
    row.suggestions = scored.sort((a, b) => b.n - a.n || (our.programs.has(b.s.id) ? 1 : 0) - (our.programs.has(a.s.id) ? 1 : 0)).slice(0, 4).map(x => ({ id: x.s.id, name: x.s.name }))
    return row
  }
  const s = our.schools.get(id)
  row.schoolId = id
  row.ourName = s?.name ?? `school ${id}`
  row.noProgram = !our.programs.has(id)
  if (our.inactive.has(id)) row.info.push(`${row.ourName} is marked inactive for this season`)
  const cmp = (field: Diff['field'], ours: number | null, track: number[], last: number | null) => {
    if (track.length === 0 && ours == null) return
    if (track.length === 1 && ours === track[0]) return
    row.diffs.push({ field, ours, track, last, stale: ours != null && track.length === 1 && last === track[0] })
  }
  cmp('district', our.district.get(id) ?? null, team.districts, our.lastDistrict.get(id) ?? null)
  cmp('region', our.region.get(id) ?? null, team.regions, our.lastRegion.get(id) ?? null)
  const conf = our.conference.get(id) ?? null
  const leagues = team.others.filter(l => !/county$/i.test(l))
  if (leagues.length && !leagues.some(l => conf && looseName(conf).includes(looseName(l).replace(/ conference$/, '')))) row.info.push(`Track lists ${leagues.join(', ')}; our conference is ${conf ?? 'not set'}`)
  const county = team.others.find(l => /county$/i.test(l))
  if (county && s?.county && looseName(county) !== looseName(`${s.county} County`)) row.info.push(`Track lists ${county}; our county is ${s.county}`)
  // Track's names and abbreviation, saved as this school's aliases (an alias names one school only)
  const known = our.namesBySchool.get(id) ?? new Set<string>()
  for (const n of [team.seasonName, team.globalName, team.abbr]) {
    if (!n || known.has(n.toLowerCase()) || row.newAliases.includes(n)) continue
    const a = our.aliasByLower.get(n.toLowerCase())
    if (a && a.schoolId !== id) { row.aliasClash.push(`“${n}” already names ${our.schools.get(a.schoolId)?.name ?? 'another school'}`); continue }
    const other = [...our.namesBySchool].find(([sid, ns]) => sid !== id && ns.has(n.toLowerCase()))
    if (other) { row.aliasClash.push(`“${n}” is also ${our.schools.get(other[0])?.name}`); continue }
    row.newAliases.push(n)
  }
  return row
}

export type ReviewSummary = {
  rows: ReviewRow[]
  ourMissing: { id: number; name: string }[]   // our programs Track doesn't list (only meaningful once every page is in)
  total: number | null                          // Track's count ("of 322")
}

export function summarize(rows: ReviewRow[], our: OurData, total: number | null): ReviewSummary {
  const seen = new Set(rows.map(r => r.schoolId).filter((x): x is number => x != null))
  const ourMissing = [...our.programs].filter(id => !seen.has(id) && !our.inactive.has(id) && our.schools.has(id)).map(id => ({ id, name: our.schools.get(id)!.name })).sort((a, b) => a.name.localeCompare(b.name))
  return { rows, ourMissing, total }
}
