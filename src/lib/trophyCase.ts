// School profile · Trophy Case (Kyle 2026-11-13). Individual: every state podium finish, region title and district
// title (districts on file from 2013 on: our brackets, and the Playoff History seasons staged from the TrackWrestling
// exports until they load) by the school's wrestlers. Team: sectional and state (group) titles. From the history tables (history_finishes,
// history_team_titles: boys from njwrestlinghistory.info, credited where shown; girls from TrackWrestling and
// MatWhizzer), each school name matched to one of our schools (src/lib/historySchools.ts). Service role, cached 5 min.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { schoolMatcher, historyFinishSchools, historySchoolLabel } from '@/lib/historySchools'
import { sameLastName } from '@/lib/trophyRows'
import { boysTeamChampions } from '@/lib/teamHistory'

export type TrophyIndividual = { year: number; name: string; weight: string; level: 'state' | 'region' | 'district'; place: number; tie: string | null; region: string | null; as?: string | null; wid?: string | null }   // wid: our wrestler, for the link (Kyle 2026-11-19: every name clickable); as: "Washington (Warren Hills)" for a finish at an old school connected to this one
export type TrophyTeam = { year: number; kind: 'group' | 'sectional'; grp: string; section: string | null }
export type TrophyCaseData = { individual: TrophyIndividual[]; team: TrophyTeam[]; credit: boolean }

export async function trophyIndex(gender: 'M' | 'F') {
  const db = createSupabaseAdmin()
  const m = await schoolMatcher(db)
  const fin: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('history_finishes').select('year, level, region, region_name, weight, place, tie, name, school, source, wrestler_id').eq('gender', gender).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    fin.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const titles: Record<string, unknown>[] = []
  if (gender === 'M') {   // team titles on file are boys
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('history_team_titles').select('kind, year, grp, section, champion').order('id').range(from, from + 999)
      if (error) throw new Error(error.message)
      titles.push(...(data ?? []))
      if ((data ?? []).length < 1000) break
    }
  }
  const out: Record<number, TrophyCaseData> = {}
  const of = (id: number) => (out[id] ??= { individual: [], team: [], credit: false })
  // One school per finish: the name, the region for a shared name (St. Joseph, Manchester, Franklin), or the same
  // wrestler's region title (src/lib/historySchools.ts)
  const ids = historyFinishSchools(fin as { level: string; year: number; region: number | null; weight: string; place: number; name: string; school: string | null }[], m, sameLastName)
  // Our brackets first (Kyle 2026-11-16: NJ Wrestling History "only fills in gaps for years we don't have bracket info"):
  // each state podium and region title from our placements; NJ Wrestling History only for the years before them
  const ours = new Set<string>()   // "level|season" with our placements on file
  // girls keep their history rows; each finds its profile through our placement of the same season, level, weight,
  // place and school (Kyle 2026-11-19: every name clickable)
  const girlsWid = new Map<string, string>()
  {
    const { data: tr, error } = await db.from('tournaments').select('id, season_id, name, tournament_type').eq('gender', gender)
      .in('tournament_type', gender === 'F' ? ['girls_state', 'girls_regions'] : ['boys_state', 'regions'])
    if (error) throw new Error(error.message)
    const tour = new Map((tr ?? []).map(t => [t.id as number, t as { id: number; season_id: number; name: string; tournament_type: string }]))
    const tids = [...tour.keys()]
    for (let from = 0; tids.length; from += 1000) {
      const { data, error: e2 } = await db.from('placements').select('id, tournament_id, place, weight_classes(weight), entry:entry_id(school_id, wrestler:wrestlers(id, first_name, last_name))')
        .in('tournament_id', tids).order('id').range(from, from + 999)
      if (e2) throw new Error(e2.message)
      for (const p of (data ?? []) as unknown as { tournament_id: number; place: number; weight_classes: { weight: number } | null; entry: { school_id: number | null; wrestler: { id: string; first_name: string; last_name: string } | null } | null }[]) {
        const t = tour.get(p.tournament_id)!
        const level = /state/.test(t.tournament_type) ? 'state' : 'region'
        ours.add(`${level}|${t.season_id}`)
        if (level === 'region' && p.place !== 1) continue   // region: titles only
        if (gender === 'F' && p.entry?.school_id != null && p.entry.wrestler) girlsWid.set(`${level}|${t.season_id}|${p.weight_classes?.weight ?? ''}|${p.place}|${p.entry.school_id}`, p.entry.wrestler.id)
        if (gender === 'F' || p.entry?.school_id == null || !p.entry.wrestler) continue   // girls keep their history rows (not NJ Wrestling History)
        of(p.entry.school_id).individual.push({ year: t.season_id, name: `${p.entry.wrestler.first_name} ${p.entry.wrestler.last_name}`, weight: String(p.weight_classes?.weight ?? ''), level, place: p.place, tie: null,
          region: level === 'region' ? `Region ${Number(/r(\d+)$/.exec(t.name)?.[1])}` : null, wid: p.entry.wrestler.id })
      }
      if ((data ?? []).length < 1000) break
    }
  }
  fin.forEach((f, i) => {
    const id = ids[i]
    if (id == null) return
    if (f.level === 'region' && f.place !== 1) return   // region: titles only
    if (f.source === 'njwh' && ours.has(`${f.level}|${f.year}`)) return   // a year our brackets cover
    const t = of(id)
    const label = historySchoolLabel(f.school as string | null, m.school.get(id)?.display_name ?? null)
    t.individual.push({ year: f.year as number, name: f.name as string, weight: f.weight as string, level: f.level as 'state' | 'region', place: f.place as number, tie: (f.tie as string | null) ?? null, region: (f.region_name as string | null) ?? (f.region != null ? `Region ${f.region}` : null), as: label && label !== m.school.get(id)?.display_name ? label : null, wid: (f.wrestler_id as string | null) ?? girlsWid.get(`${f.level}|${f.year}|${Number.parseInt(f.weight as string)}|${f.place}|${id}`) ?? null })
    if (f.source === 'njwh') t.credit = true
  })
  // team titles: our team brackets, then NJ Wrestling History for the years before them
  const ourTeams = gender === 'M' ? await boysTeamChampions() : []
  const ourTeamYears = new Set(ourTeams.map(c => c.year))
  for (const c of ourTeams) of(c.school_id).team.push({ year: c.year, kind: c.kind, grp: c.grp, section: c.section })
  for (const x of titles) {
    if (ourTeamYears.has(x.year as number)) continue
    const id = m.idOf(x.champion as string)
    if (id == null) continue
    const t = of(id)
    t.team.push({ year: x.year as number, kind: x.kind as 'group' | 'sectional', grp: x.grp as string, section: (x.section as string | null) ?? null })
    t.credit = true
  }
  // district titles: our district brackets (finals), then staged history seasons we don't have as brackets yet
  const tours: { id: number; season_id: number; name: string }[] = []
  {
    const { data, error } = await db.from('tournaments').select('id, season_id, name').eq('gender', gender).eq('tournament_type', 'districts')
    if (error) throw new Error(error.message)
    tours.push(...(data ?? []))
  }
  const haveSeasons = new Set<number>()
  for (let i = 0; i < tours.length; i += 50) {
    const ids = tours.slice(i, i + 50).map(t => t.id)
    const { data: finals, error } = await db.from('matches').select('tournament_id, winner_entry_id, weight_classes(weight), entry:tournament_entries!winner_entry_id(school_id, wrestlers(id, first_name, last_name))')
      .in('tournament_id', ids).eq('round', 'F').eq('bracket_side', 'championship').eq('validated', true)
    if (error) throw new Error(error.message)
    for (const f of (finals ?? []) as unknown as { tournament_id: number; weight_classes: { weight: number } | null; entry: { school_id: number | null; wrestlers: { id: string; first_name: string; last_name: string } | null } | null }[]) {
      const t = tours.find(x => x.id === f.tournament_id)!
      if (!f.entry?.school_id || !f.entry.wrestlers) continue
      haveSeasons.add(t.season_id)
      of(f.entry.school_id).individual.push({ year: t.season_id, name: `${f.entry.wrestlers.first_name} ${f.entry.wrestlers.last_name}`, weight: String(f.weight_classes?.weight ?? ''), level: 'district', place: 1, tie: null, region: t.name.replace(/^.*District /, 'District '), wid: f.entry.wrestlers.id })
    }
  }
  // A district with a podium but no bracket on file (history_podiums: the 2012-13 boys District 24 from the Shore
  // Conference archives, Kyle 2026-11-14)
  {
    const { data, error } = await db.from('history_podiums').select('weight, school_id, wrestler:wrestlers(id, first_name, last_name), tournament:tournaments!inner(name, season_id, gender, tournament_type)')
      .eq('place', 1).not('weight', 'is', null).eq('tournament.gender', gender).eq('tournament.tournament_type', 'districts')
    if (error) throw new Error(error.message)
    for (const p of (data ?? []) as unknown as { weight: number; school_id: number | null; wrestler: { id: string; first_name: string; last_name: string } | null; tournament: { name: string; season_id: number } }[]) {
      if (p.school_id == null || !p.wrestler) continue
      of(p.school_id).individual.push({ year: p.tournament.season_id, name: `${p.wrestler.first_name} ${p.wrestler.last_name}`, weight: String(p.weight), level: 'district', place: 1, tie: null, region: p.tournament.name.replace(/^.*District /, 'District '), wid: p.wrestler.id })
    }
  }
  {
    const teams = new Map<string, number | null>()
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from('playoff_history_schools').select('raw_name, school_id').eq('gender', gender).order('raw_name').range(from, from + 999)
      for (const r of data ?? []) teams.set(r.raw_name, r.school_id)
      if ((data ?? []).length < 1000) break
    }
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('playoff_history_entrants').select('id, season_id, num, weight, name, team, wrestler:wrestlers(id, first_name, last_name)').eq('gender', gender).eq('kind', 'district').eq('place', 1).order('id').range(from, from + 999)
      if (error) break   // no staging yet: districts from our brackets only
      for (const e of (data ?? []) as unknown as { season_id: number; num: number; weight: number; name: string; team: string; wrestler: { id: string; first_name: string; last_name: string } | null }[]) {
        const id = teams.get(e.team)
        if (id == null || haveSeasons.has(e.season_id)) continue
        of(id).individual.push({ year: e.season_id, name: e.wrestler ? `${e.wrestler.first_name} ${e.wrestler.last_name}` : e.name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim(), weight: String(e.weight), level: 'district', place: 1, tie: null, region: `District ${e.num}`, wid: e.wrestler?.id ?? null })
      }
      if ((data ?? []).length < 1000) break
    }
  }
  const LEVEL = { state: 0, region: 1, district: 2 }
  for (const t of Object.values(out)) {
    t.individual.sort((a, b) => b.year - a.year || LEVEL[a.level] - LEVEL[b.level] || a.place - b.place || Number.parseInt(a.weight) - Number.parseInt(b.weight))
    t.team.sort((a, b) => b.year - a.year || (a.kind === b.kind ? 0 : a.kind === 'group' ? -1 : 1))
  }
  return out
}

// The whole boys index is ~2.5 MB, over the data cache's 2 MB limit, so it was never saved and every school page
// rebuilt it (~2 s a click, 2026-11-16). Each school's case is cached on its own instead; a miss builds the index once
// per server instance every 5 minutes (shared by the schools that miss in that window).
const built = new Map<'M' | 'F', { at: number; index: Promise<Awaited<ReturnType<typeof trophyIndex>>> }>()
function memoIndex(gender: 'M' | 'F') {
  const hit = built.get(gender)
  if (hit && Date.now() - hit.at < 300_000) return hit.index
  const index = trophyIndex(gender)
  built.set(gender, { at: Date.now(), index })
  index.catch(() => built.delete(gender))
  return index
}

export async function loadTrophyCase(schoolId: number, gender: 'M' | 'F'): Promise<TrophyCaseData> {
  return unstable_cache(async () => (await memoIndex(gender))[schoolId] ?? { individual: [], team: [], credit: false },
    ['trophy-case', gender, String(schoolId), process.env.VERCEL_DEPLOYMENT_ID ?? 'local'], { revalidate: 300, tags: ['trophy-case'] })()
}
