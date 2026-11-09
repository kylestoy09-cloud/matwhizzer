// Girls 2024-25 regions: what's missing against the TrackWrestling export (2026-11-09). Read-only.
// Stored, these tournaments start at Round 2 and have no 3rd place bouts (Central 134, North 1 135,
// North 2 136, South 137). This lists the export's Round 1 and 3rd place bouts and, for each wrestler in
// them, whether she has an entry in that region at that weight, a profile linked to that school (a name
// alias), or nothing. The 2024-25 export section headers ("Region 1/2/4", "District 3") are paired with the
// stored tournament that has the most of the section's wrestlers (as compare_girls_bracket_counts.mts).
//   npx tsx --tsconfig tsconfig.json scripts/audit_girls_2025_regions.mts [--list]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LIST = process.argv.includes('--list')
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const FILE = '../Whizzer Upload/Match Data/2025 Girls Region Data.py'
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const lastOf = (s: string) => norm(s.trim().split(/\s+/).slice(-1)[0] ?? '')

type Bout = { round: string; weight: number; win: string; winSchool: string; lose: string; loseSchool: string; result: string; line: string }
type Sec = { head: string; bouts: Bout[]; names: Set<string> }
const secs: Sec[] = []
let cur: Sec | null = null, weight = 0
const seen = new Set<string>()
for (const raw of fs.readFileSync(FILE, 'utf8').split('\n')) {
  const l = raw.trim()
  if (/^(Region|District) \d+$/.test(l)) { cur = { head: l, bouts: [], names: new Set() }; secs.push(cur); continue }
  if (!cur) continue
  if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
  const m = l.match(/^([^-]+?) - (.*?) \((.*?)\) [\d-]+ won (?:by|in) .*? over (?:([^()]*?) )?\((.*?)\)(?: [\d-]+)? \((.*)\)$/)
  if (!m) continue
  const label = m[1].trim()
  for (const n of [m[2], m[4] ?? '']) if (n && !FILLER.test(n.trim())) cur.names.add(lastOf(n))
  const round = /^Champ\. Round 1\b/.test(label) ? 'R1' : /^3rd Place\b/.test(label) ? '3rd_Place' : null
  if (!round) continue
  const k = `${cur.head}|${weight}|${l}`; if (seen.has(k)) continue; seen.add(k)
  cur.bouts.push({ round, weight, win: m[2].trim(), winSchool: m[3].trim(), lose: (m[4] ?? '').trim(), loseSchool: m[5].trim(), result: m[6], line: l })
}

const tours = (await db.from('tournaments').select('id, name').eq('season_id', 2025).eq('gender', 'F').eq('tournament_type', 'girls_regions')).data!
const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.weight, w.id]))
const stored = new Map<number, { ents: any[]; last: Set<string> }>()
for (const t of tours) {
  const ents = await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, school_id, wrestler_id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to))
  stored.set(t.id, { ents, last: new Set(ents.map((e: any) => norm(e.wrestlers?.last_name ?? ''))) })
}
// name aliases: raw name at a school → profile (how imports link a name to a wrestler)
const aliases = await all((f, to) => db.from('wrestler_name_aliases').select('raw_name, school_id, wrestler_id').range(f, to))
const schools = await all((f, to) => db.from('schools').select('id, display_name').range(f, to))
const schoolByName = (s: string) => schools.filter((x: any) => norm(x.display_name) === norm(s)).map((x: any) => x.id)

const totals = { bouts: 0, r1: 0, third: 0, filler: 0, both: 0, missingSide: 0, aliasOnly: 0, nothing: 0 }
const nothingList: string[] = []
for (const sec of secs) {
  const pick = tours.map(t => ({ t, n: [...sec.names].filter(x => stored.get(t.id)!.last.has(x)).length })).sort((a, b) => b.n - a.n)[0]
  const st = stored.get(pick.t.id)!
  let both = 0, missingSide = 0
  for (const b of sec.bouts) {
    totals.bouts++; if (b.round === 'R1') totals.r1++; else totals.third++
    if (FILLER.test(b.lose)) { totals.filler++; continue }
    const wc = wcs.get(b.weight)
    const has = (name: string) => st.ents.some((e: any) => e.weight_class_id === wc && norm(`${e.wrestlers?.first_name}${e.wrestlers?.last_name}`) === norm(name))
    const sides = [[b.win, b.winSchool], [b.lose, b.loseSchool]] as const
    const missing = sides.filter(([n]) => !has(n))
    if (!missing.length) { both++; continue }
    missingSide++
    for (const [n, s] of missing) {
      const sids = schoolByName(s)
      const al = aliases.filter((a: any) => norm(a.raw_name) === norm(n) && (sids.length === 0 || sids.includes(a.school_id)))
      if (al.length) totals.aliasOnly++
      else { totals.nothing++; nothingList.push(`${pick.t.name.replace('Girl_s Regions ', '')} ${b.weight} ${b.round}: ${n} (${s})`) }
    }
  }
  totals.both += both; totals.missingSide += missingSide
  console.log(`${sec.head} → ${pick.t.name.replace('Girl_s ', '')}: R1 ${sec.bouts.filter(b => b.round === 'R1').length}, 3rd ${sec.bouts.filter(b => b.round === '3rd_Place').length}; both wrestlers entered ${both}, a wrestler without an entry ${missingSide}`)
  if (LIST) for (const b of sec.bouts) console.log('    ' + b.line.slice(0, 150))
}
console.log(`\ntotal export bouts to add: ${totals.bouts} (R1 ${totals.r1}, 3rd ${totals.third}; ${totals.filler} over filler)`)
console.log(`wrestlers without an entry: ${totals.aliasOnly + totals.nothing} (a name alias at that school: ${totals.aliasOnly}; no alias: ${totals.nothing})`)
if (LIST) console.log(nothingList.join('\n'))
