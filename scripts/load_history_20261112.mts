// Load the NJ boys wrestling history (data/njwh/, scraped 2026-11-02) into history_finishes and
// history_team_titles for the Daily Challenge page (Kyle 2026-11-12). Admin only.
//   * State: every placer 1938–2026 (state_medalists.json); champions' names from state_champions.json
//     (preferred for champions, README), which also supplies 1934–37 (no medal lists for those years).
//   * Region champions 1961–2026. 2021 (COVID) wrestled four Super Regions and both regions of each list
//     the same champions, so each Super Region is loaded once (under its first region, with the note).
//   * Group and sectional team titles.
// Refuses to run if the tables already hold rows.
//   npx tsx scripts/load_history_20261112.mts            dry run (counts)
//   npx tsx scripts/load_history_20261112.mts --apply
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const read = (f: string) => JSON.parse(readFileSync(`data/njwh/${f}.json`, 'utf8'))
const w = (x: unknown) => String(x)

const medalists = read('state_medalists') as { year: number; weight: number | string; place: number; tie: string | null; name: string; school: string }[]
const champions = read('state_champions') as { year: number; weight: number | string; name: string; school: string }[]
const regions = read('region_champions') as { region: number; year: number; weight: number | string; name: string; school: string; note?: string }[]
const groups = read('group_champions') as { group: string; year: number; champion: string; runner_up: string | null }[]
const sectionals = read('sectional_champions') as { group: string; year: number; section: string; champion: string }[]

const champ = new Map(champions.map(c => [`${c.year}|${w(c.weight)}`, c]))
const finishes: Record<string, unknown>[] = []
const medalYears = new Set(medalists.map(m => m.year))
for (const m of medalists) {
  const c = m.place === 1 ? champ.get(`${m.year}|${w(m.weight)}`) : undefined
  finishes.push({ level: 'state', year: m.year, region: null, weight: w(m.weight), place: m.place, tie: m.tie, name: c?.name ?? m.name, school: c?.school ?? m.school, note: null })
}
for (const c of champions) if (!medalYears.has(c.year)) finishes.push({ level: 'state', year: c.year, region: null, weight: w(c.weight), place: 1, tie: null, name: c.name, school: c.school, note: null })
const superSeen = new Set<string>()
let superSkipped = 0
for (const r of regions) {
  if (r.note) {
    const k = `${r.note}|${r.year}|${w(r.weight)}|${r.name}`
    if (superSeen.has(k)) { superSkipped++; continue }
    superSeen.add(k)
  }
  finishes.push({ level: 'region', year: r.year, region: r.region, weight: w(r.weight), place: 1, tie: null, name: r.name, school: r.school, note: r.note ?? null })
}
const titles = [
  ...groups.map(g => ({ kind: 'group', year: g.year, grp: g.group, section: null, champion: g.champion, runner_up: g.runner_up })),
  ...sectionals.map(s => ({ kind: 'sectional', year: s.year, grp: s.group, section: s.section, champion: s.champion, runner_up: null })),
]
console.log(`state finishes ${finishes.filter(f => f.level === 'state').length} | region champions ${finishes.filter(f => f.level === 'region').length} (2021 Super Region duplicates left out: ${superSkipped}) | team titles ${titles.length}`)
if (!APPLY) process.exit(0)

for (const t of ['history_finishes', 'history_team_titles']) {
  const { count, error } = await db.from(t).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${t}: ${error.message}`)
  if (count) throw new Error(`${t} already has ${count} rows — stopping`)
}
for (let i = 0; i < finishes.length; i += 1000) { const { error } = await db.from('history_finishes').insert(finishes.slice(i, i + 1000)); if (error) throw new Error(error.message) }
for (let i = 0; i < titles.length; i += 1000) { const { error } = await db.from('history_team_titles').insert(titles.slice(i, i + 1000)); if (error) throw new Error(error.message) }
const n1 = (await db.from('history_finishes').select('*', { count: 'exact', head: true })).count
const n2 = (await db.from('history_team_titles').select('*', { count: 'exact', head: true })).count
console.log(`loaded: history_finishes ${n1}, history_team_titles ${n2}`)
