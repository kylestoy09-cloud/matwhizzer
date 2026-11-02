// Finds wrestler profiles that look like they hold the wrong bouts: in one season, bouts for
// two schools on the same day, or back and forth between schools. Groups them as
//   merged          likely two people on one profile (split them: split_merged_wrestlers.mts)
//   wrongTeamBout   bouts filed under the other team at a dual against the wrestler's own
//                   school; reported by meet, since the fix is to that meet
//   duplicateSchool the same school under two records ("Green Run" / "Green Run, VA")
//   placeholder     the "Unknown" placeholder wrestler
// Run: npx tsx --tsconfig tsconfig.json scripts/find_mixed_wrestler_profiles.mts [--json out.json]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, cols: string) {
  const out: Record<string, any>[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from(t).select(cols).order('id').range(f, f + 999)
    if (error) throw new Error(`${t}: ${error.message}`)
    out.push(...(data as any[])); if (!data || data.length < 1000) break
  }
  return out
}
const schools = await all('schools', 'id, display_name, is_nj')
const sname = new Map(schools.map(s => [s.id, s.display_name as string]))
const norm = (n: string) => n.toLowerCase().replace(/,\s*[a-z]{2}$/, '').replace(/[^a-z0-9]/g, '')
type App = { date: string; season: string; school: number; weight: number; meetSchools: number[]; meetId: string | null; src: 'dual' | 'tourn' }
const report: any = {}
for (const g of ['M', 'F'] as const) {
  const apps = new Map<string, App[]>()
  const add = (w: string | null, a: App) => { if (w) apps.set(w, [...(apps.get(w) ?? []), a]) }
  const meets = new Map((await all(g === 'F' ? 'dual_meets_girls' : 'dual_meets', 'id, meet_date, season_id, team1_school_id, team2_school_id')).map(m => [m.id, m]))
  for (const m of await all(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, wrestler_a_id, school_a_id, wrestler_b_id, school_b_id, weight_class')) {
    const mt = meets.get(m.dual_meet_id); if (!mt) continue
    const base = { date: mt.meet_date, season: String(mt.season_id), weight: m.weight_class, meetSchools: [mt.team1_school_id, mt.team2_school_id], meetId: mt.id, src: 'dual' as const }
    if (m.school_a_id) add(m.wrestler_a_id, { ...base, school: m.school_a_id })
    if (m.school_b_id) add(m.wrestler_b_id, { ...base, school: m.school_b_id })
  }
  const tourns = new Map((await all(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id, start_date, season')).map(t => [t.id, t]))
  for (const b of await all(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, weight_class, wrestler1_id, wrestler1_school_id, wrestler2_id, wrestler2_school_id')) {
    const t = tourns.get(b.in_season_tournament_id); if (!t?.start_date) continue
    const base = { date: t.start_date, season: String(t.season), weight: b.weight_class, meetSchools: [] as number[], meetId: null, src: 'tourn' as const }
    if (b.wrestler1_school_id) add(b.wrestler1_id, { ...base, school: b.wrestler1_school_id })
    if (b.wrestler2_school_id) add(b.wrestler2_id, { ...base, school: b.wrestler2_school_id })
  }
  const { data: wr } = await db.from('wrestlers').select('id, first_name, last_name').eq('gender', g).limit(100000)
  const wname = new Map((wr ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`.trim()]))
  const out: Record<string, any[]> = { merged: [], wrongTeamBout: [], duplicateSchool: [], placeholder: [] }
  for (const [w, list] of apps) {
    const name = wname.get(w) ?? w
    for (const season of new Set(list.map(a => a.season))) {
      const l = list.filter(a => a.season === season).sort((a, b) => a.date.localeCompare(b.date))
      const bySchool = new Map<number, App[]>(); for (const a of l) bySchool.set(a.school, [...(bySchool.get(a.school) ?? []), a])
      if (bySchool.size < 2) continue
      const byDate = new Map<string, Set<number>>(); for (const a of l) byDate.set(a.date, (byDate.get(a.date) ?? new Set()).add(a.school))
      const seq = l.map(a => a.school).filter((s, i, arr) => i === 0 || s !== arr[i - 1])
      if (![...byDate.values()].some(s => s.size > 1) && new Set(seq).size === seq.length) continue
      const ranked = [...bySchool].sort((a, b) => b[1].length - a[1].length)
      const main = ranked[0][0], others = ranked.slice(1)
      const row = {
        wrestler_id: w, name, season, main_school: sname.get(main), main_school_id: main,
        schools: ranked.map(([s, as]) => ({ school: sname.get(s) ?? String(s), school_id: s, bouts: as.length,
          weights: [...new Set(as.map(a => a.weight))].sort((x, y) => x - y),
          meets: [...new Set(as.filter(a => a.meetId).map(a => `${a.date} ${a.meetId}`))] })),
      }
      if (/^unknown\b/i.test(name)) out.placeholder.push(row)
      else if (others.every(([s]) => norm(sname.get(s) ?? '') === norm(sname.get(main) ?? ''))) out.duplicateSchool.push(row)
      else if (others.every(([, as]) => as.every(a => a.src === 'dual' && a.meetSchools.includes(main)))) out.wrongTeamBout.push(row)
      else out.merged.push(row)
      break
    }
  }
  report[g] = out
  console.log(g, Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])))
}
const i = process.argv.indexOf('--json')
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(report, null, 1))
