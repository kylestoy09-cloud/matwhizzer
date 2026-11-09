// Girls 2024-25 regions, step 2 plan (2026-11-09). Read-only: writes a plan file, changes nothing.
// The region Round 1 bouts (and three step-1 bouts) have a wrestler with no region entry. For each such
// wrestler this decides who she is, by the rules already set:
//   1. her school: the export's school name matched by src/lib/matchSchools.ts, exact or alias only
//   2. her name linked at that school (wrestler_name_aliases) → that profile
//   3. otherwise Kyle's rule (2026-11-05): a same-name girls profile linked only at another school is a
//      different person → a new profile. No same-name profile anywhere → a new profile.
//   Only real coin flips are listed for Kyle: two or more profiles her name is linked to at that school, or
//   the school name not matched exactly.
// Output: docs/reviews/girls_2025_region_r1_plan.json (entries to create, profiles to create, bouts) and a summary.
//   npx tsx --tsconfig tsconfig.json scripts/plan_girls_2025_region_r1.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { matchSchoolNames } from '../src/lib/matchSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const DIR = '../Whizzer Upload/Match Data'
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const lastOf = (s: string) => norm(s.trim().split(/\s+/).slice(-1)[0] ?? '')
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i

type Bout = { tournament: string; round: string; side: string; weight: number; win: string; winSchool: string; lose: string; loseSchool: string; result: string; line: string }
const bouts: Bout[] = []
function parse(file: string, type: string, wanted: (l: string) => [string, string] | null) {
  const secs: { head: string; bouts: Bout[]; names: Set<string> }[] = []
  let cur: (typeof secs)[number] | null = null, weight = 0
  const seen = new Set<string>()
  for (const raw of fs.readFileSync(`${DIR}/${file}`, 'utf8').split('\n')) {
    const l = raw.trim()
    if (/^(Region|District) \d+$/.test(l)) { cur = { head: l, bouts: [], names: new Set() }; secs.push(cur); continue }
    if (!cur) { cur = { head: type, bouts: [], names: new Set() }; secs.push(cur) }
    if (/^\d{3}$/.test(l)) { weight = Number(l); continue }
    const m = l.match(/^([^-]+?) - (.*?) \((.*?)\) [\d-]+ won (?:by|in) .*? over (?:([^()]*?) )?\((.*?)\)(?: [\d-]+)? \((.*)\)$/)
    if (!m) continue
    for (const n of [m[2], m[4] ?? '']) if (n && !FILLER.test(n.trim())) cur.names.add(lastOf(n))
    const w = wanted(m[1].trim()); if (!w) continue
    const k = `${cur.head}|${weight}|${l}`; if (seen.has(k)) continue; seen.add(k)
    cur.bouts.push({ tournament: '', round: w[0], side: w[1], weight, win: m[2].trim(), winSchool: m[3].trim(), lose: (m[4] ?? '').trim(), loseSchool: m[5].trim(), result: m[6], line: l })
  }
  return secs
}

const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(w => [w.weight, w.id]))
const tours = (await db.from('tournaments').select('id, name, tournament_type').eq('season_id', 2025).eq('gender', 'F')).data!
const ents = new Map<number, any[]>()
for (const t of tours) ents.set(t.id, await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, wrestler_id, school_id, school_context_raw, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to)))
const pick = (type: string, names: Set<string>) => {
  let best: any = null, n = -1
  for (const t of tours.filter(x => x.tournament_type === type)) { const last = new Set(ents.get(t.id)!.map((e: any) => norm(e.wrestlers?.last_name ?? ''))); const c = [...names].filter(x => last.has(x)).length; if (c > n) { best = t; n = c } }
  return best
}
for (const s of parse('2025 Girls Region Data.py', 'girls_regions', l => (/^Champ\. Round 1\b/.test(l) ? ['R1', 'championship'] : /^3rd Place\b/.test(l) ? ['3rd_Place', 'consolation'] : null))) {
  const t = pick('girls_regions', s.names); for (const b of s.bouts) bouts.push({ ...b, tournament: String(t.id) })
}
for (const s of parse('2025 Girls State Data.py', 'girls_state', l => (/^Champ\. Round 1\b/.test(l) ? ['R1', 'championship'] : null))) {
  const t = pick('girls_state', s.names); for (const b of s.bouts) bouts.push({ ...b, tournament: String(t.id) })
}

// the wrestlers with no entry in that tournament at that weight
const entryOf = (tid: number, wc: number, name: string) => { const c = ents.get(tid)!.filter((e: any) => e.weight_class_id === wc && norm(`${e.wrestlers?.first_name}${e.wrestlers?.last_name}`) === norm(name)); return c.length === 1 ? c[0] : null }
type Need = { key: string; tournament_id: number; weight: number; name: string; school: string }
const need = new Map<string, Need>()
const todo: Bout[] = []
for (const b of bouts) {
  const tid = Number(b.tournament), wc = wcs.get(b.weight)!
  const sides = [[b.win, b.winSchool], ...(FILLER.test(b.lose) ? [] : [[b.lose, b.loseSchool]])] as [string, string][]
  const missing = sides.filter(([n]) => !entryOf(tid, wc, n))
  if (!missing.length) continue                            // step 1 bouts (both entered)
  todo.push(b)
  for (const [n, s] of missing) need.set(`${tid}|${b.weight}|${norm(n)}`, { key: `${tid}|${b.weight}|${norm(n)}`, tournament_id: tid, weight: b.weight, name: n, school: s })
}

// schools
const schoolNames = [...new Set([...need.values()].map(x => x.school))]
// one name at a time, girls, 2024-25 (season-aware: co-op and season names)
const schoolOf = new Map<string, any>()
for (const n of schoolNames) schoolOf.set(n, await matchSchoolNames(n, { gender: 'F', seasonId: 2025 }))
// profiles: name links, and every girls profile by name
const aliases = await all((f, to) => db.from('wrestler_name_aliases').select('raw_name, school_id, wrestler_id').range(f, to))
const girls = await all((f, to) => db.from('wrestlers').select('id, first_name, last_name, gender, graduation_year, is_oos').eq('gender', 'F').range(f, to))
const girlById = new Map(girls.map((g: any) => [g.id, g]))
const linksOf = (wid: string) => aliases.filter((a: any) => a.wrestler_id === wid).map((a: any) => a.school_id)

// Kyle's decisions (2026-11-09): who-is-who calls the rules can't make
const DECIDED: Record<string, { wrestler_id: string | null; why: string }> = {
  'alexisdozier': { wrestler_id: '285982d1-a02f-4a40-815d-941517302335', why: 'Kyle: Lexi Dozier (Leonia-Palisades, class of 2026)' },
  'adelaidemattaarvo': { wrestler_id: 'ARVO', why: 'same first name, fuller last name, linked at the same school' },
  'mariariveraperez': { wrestler_id: null, why: 'new profile: the only Perez at the school is Valeria' },
  'genesismartinez': { wrestler_id: null, why: 'new profile: the Martinez girls at the school are Elida and Elisha' },
}
// the 2024-25 JFK/Woodbridge/Colonia co-op is Colonia (149); a link at any member school is a link at the co-op
const COOP_MEMBERS: Record<number, number[]> = { 149: [149, 150, 187] }
const plan: any[] = [], flags: string[] = []
const cnt = { linked: 0, newNoSame: 0, newOtherSchool: 0, flag: 0 }
// 2024-25 co-op names the matcher doesn't know: the schools the season's other girls entries under that
// name use (Cliffside Park/Ridgefield Memorial: 364; JFK/Woodbridge/Colonia: its members 149, 150, 187)
const coop = new Map<string, number[]>()
for (const list of ents.values()) for (const e of list as any[]) {
  if (!e.school_id) continue
  const raw = (e as any).school_context_raw
  if (raw) coop.set(raw, [...new Set([...(coop.get(raw) ?? []), e.school_id])])
}
for (const x of need.values()) {
  let sm: any = schoolOf.get(x.school)
  const members = coop.get(x.school)
  if ((!sm || !sm.schoolId || sm.confidence !== 'exact') && members?.length) {
    // the member school her name is linked at, else the only member
    const at = members.filter(sid => aliases.some((a: any) => a.school_id === sid && norm(a.raw_name) === norm(x.name)))
    const sid = at.length === 1 ? at[0] : members.length === 1 ? members[0] : null
    if (sid) sm = { schoolId: sid, confidence: 'exact', displayName: `${x.school} → school ${sid}` }
  }
  if (!sm || !sm.schoolId || !['exact'].includes(sm.confidence)) { flags.push(`${x.name} (${x.school}) ${x.weight}: school not matched exactly (${sm?.confidence ?? 'none'}${sm?.displayName ? ' → ' + sm.displayName : ''})`); cnt.flag++; continue }
  const sid = sm.schoolId
  const at = x.school === 'JFK/Woodbridge/Colonia' ? COOP_MEMBERS[149] : [sid]
  const d = DECIDED[norm(x.name)]
  if (d) {
    let wid = d.wrestler_id
    if (wid === 'ARVO') wid = girls.find((g: any) => norm(`${g.first_name}${g.last_name}`) === 'adelaidearvo')?.id ?? null
    plan.push({ ...x, school_id: sid, wrestler_id: wid, how: `decided: ${d.why}` }); if (wid) cnt.linked++; else cnt.newNoSame++; continue
  }
  const linked = [...new Set(aliases.filter((a: any) => norm(a.raw_name) === norm(x.name) && at.includes(a.school_id)).map((a: any) => a.wrestler_id))].filter(w => girlById.has(w))
  if (linked.length === 1) { plan.push({ ...x, school_id: sid, wrestler_id: linked[0], how: 'linked at the school' }); cnt.linked++; continue }
  if (linked.length > 1) { flags.push(`${x.name} (${sm.displayName}) ${x.weight}: her name is linked to ${linked.length} profiles at this school`); cnt.flag++; continue }
  // a girl linked at this school with the same last name: a spelling variant (Franchesca / Francesca)?
  const variant = girls.filter((g: any) => norm(g.last_name ?? '') === lastOf(x.name) && norm(`${g.first_name}${g.last_name}`) !== norm(x.name) && linksOf(g.id).some(s => at.includes(s)))
  if (variant.length) { flags.push(`${x.name} (${sm.displayName}) ${x.weight}: maybe ${variant.map((g: any) => `${g.first_name} ${g.last_name}`).join(' / ')} (same last name, linked at this school)`); cnt.flag++; continue }
  const same = girls.filter((g: any) => norm(`${g.first_name}${g.last_name}`) === norm(x.name))
  const sameHere = same.filter((g: any) => linksOf(g.id).some(s => at.includes(s)))
  if (sameHere.length) { flags.push(`${x.name} (${sm.displayName}) ${x.weight}: a same-name profile is linked at this school under another spelling`); cnt.flag++; continue }
  plan.push({ ...x, school_id: sid, wrestler_id: null, how: same.length ? `new profile (same name linked only at: ${same.map((g: any) => linksOf(g.id).join('/') || 'no school').join('; ')})` : 'new profile (no same-name profile)' })
  if (same.length) cnt.newOtherSchool++; else cnt.newNoSame++
}
fs.mkdirSync('docs/reviews', { recursive: true })
fs.writeFileSync('docs/reviews/girls_2025_region_r1_plan.json', JSON.stringify({ built: new Date().toISOString(), entries: plan, flags, bouts: todo }, null, 1))
console.log(`bouts waiting on an entry: ${todo.length}; wrestlers without an entry: ${need.size}`)
console.log(`  her name linked at her school (existing profile): ${cnt.linked}`)
console.log(`  new profile, no same-name girl anywhere: ${cnt.newNoSame}`)
console.log(`  new profile, same name only at another school (Kyle's rule): ${cnt.newOtherSchool}`)
console.log(`  for Kyle (coin flips / school not matched): ${cnt.flag}`)
if (flags.length) console.log('\n' + flags.join('\n'))
console.log('\nwrote docs/reviews/girls_2025_region_r1_plan.json')
