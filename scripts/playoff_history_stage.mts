// Playoff History (Kyle 2026-11-13): stage past boys postseasons for the Playoff History Review tool.
// Reads ~/Desktop/wrestling_brackets/History/<year>/ (TrackWrestling bout exports + the FloWrestling state bracket
// PDF), rebuilds every district / region / state bracket (src/lib/playoffHistory/brackets.ts), takes state seeds from
// the PDF, checks placements against NJ Wrestling History, and writes playoff_history_{seasons,bouts,entrants}.
// Team names go to playoff_history_schools (Kyle's decisions are never overwritten). Nothing on the site changes:
// the review tool's Load step writes the season, hidden until Kyle switches it on.
//   npx tsx --tsconfig tsconfig.json scripts/playoff_history_stage.mts 2013 2014 …   (no years = every folder)
//   … --girls   girls: History/Girls/<year>/ (regions + state; girls had no districts before 2025-26)
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { yearDir, readYear, GIRLS_REGION, HISTORY_DIR } from '../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../src/lib/playoffHistory/brackets'
import { readStateSeeds } from '../src/lib/playoffHistory/stateSeeds'
import { schoolMatcher } from '../src/lib/historySchools'
import { pickSchool } from '../src/lib/playoffHistory/schoolNames'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = <T,>(r: { data: T; error: { message: string } | null }, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const G: 'M' | 'F' = process.argv.includes('--girls') ? 'F' : 'M'
const years = process.argv.slice(2).map(Number).filter(Boolean)
const root = G === 'F' ? path.join(HISTORY_DIR, 'Girls') : HISTORY_DIR
const all = years.length ? years : fs.readdirSync(root).map(Number).filter(y => y > 2000 && fs.readdirSync(path.join(root, String(y))).some(f => f.endsWith('.csv'))).sort()
const m = await schoolMatcher(db as never)

// where each team name wrestled: season → district (boys) / region (girls)
const teamSeen = new Map<string, { seasons: Set<number>; at: Map<number, Set<number>> }>()

for (const year of all) {
  const { events, skipped, pdfs } = readYear(year, G)
  const WEIGHTS = [...new Set(events.flatMap(e => e.rows.map(r => Number(r.weight))))].sort((a, b) => a - b)
  const problems: string[] = skipped.map(s => `skipped duplicate file ${s}`)
  const njwh = chk(await db.from('history_finishes').select('level, region, region_name, weight, place, name').eq('gender', G).eq('year', year).limit(5000), 'history')
  const bouts: Record<string, unknown>[] = [], entrants: Record<string, unknown>[] = []
  const check = { state_placers: 0, state_match: 0, state_differ: [] as string[], region_champs: 0, region_match: 0, region_differ: [] as string[] }
  const counts: Record<string, number> = {}
  // state seeds
  const pdf = pdfs[0] ? path.join(yearDir(year, G), pdfs[0]) : null
  const seeds = pdf ? readStateSeeds(pdf, WEIGHTS) : { seeds: [], problems: ['no state bracket PDF: state seeds missing'] }
  problems.push(...seeds.problems)
  for (const ev of events.sort((a, b) => (a.kind + String(a.num).padStart(2, '0')).localeCompare(b.kind + String(b.num).padStart(2, '0')))) {
    counts[ev.kind] = (counts[ev.kind] ?? 0) + 1
    for (const b of buildBrackets(ev, G)) {
      const where = `${ev.kind === 'state' ? 'State' : ev.kind === 'district' ? `District ${ev.num}` : `Region ${G === 'F' ? GIRLS_REGION[ev.num!] ?? ev.num : ev.num}`} ${b.weight}`
      problems.push(...b.problems.map(p => `${where}: ${p}`))
      b.bouts.forEach(x => bouts.push({
        season_id: year, gender: G, kind: ev.kind, num: ev.num, weight: b.weight, round: x.round, side: x.side, bout_order: x.order,
        winner: x.winner, winner_team: x.winnerTeam, loser: x.loser, loser_team: x.loserTeam, win_type: x.winType,
        winner_score: x.winnerScore, loser_score: x.loserScore, fall_seconds: x.fallSeconds, result_raw: x.raw, round_label: x.label,
      }))
      const placeOf = new Map([...b.places].map(([p, n]) => [n, p]))
      for (const e of b.entrants) {
        const seed = ev.kind === 'state' ? seeds.seeds.find(s => s.weight === b.weight && norm(s.name) === norm(e.name))?.seed ?? null : null
        entrants.push({ season_id: year, gender: G, kind: ev.kind, num: ev.num, weight: b.weight, name: e.name, team: e.team, seed, place: placeOf.get(e.name) ?? null })
        const t = teamSeen.get(e.team) ?? teamSeen.set(e.team, { seasons: new Set(), at: new Map() }).get(e.team)!
        t.seasons.add(year)
        if (ev.kind === (G === 'F' ? 'region' : 'district')) (t.at.get(year) ?? t.at.set(year, new Set()).get(year)!).add(ev.num!)
      }
      if (ev.kind === 'state') {
        if (!b.entrants.some(e => entrants.some(x => x.kind === 'state' && x.weight === b.weight && x.name === e.name && x.seed != null))) problems.push(`State ${b.weight}: no seeds matched`)
        for (const f of njwh.filter(f => f.level === 'state' && Number(f.weight) === b.weight)) {
          check.state_placers++
          const ours = b.places.get(f.place)
          if (ours && norm(ours) === norm(f.name)) check.state_match++; else check.state_differ.push(`${b.weight} ${f.place}: NJWH ${f.name} / file ${ours ?? '—'}`)
        }
      }
      const sameRegion = (f: { region: number | null; region_name: string | null }) => G === 'F' ? (f.region_name ?? '').replace(/^Region\s*/i, '') === GIRLS_REGION[ev.num!] : Number(f.region) === ev.num
      if (ev.kind === 'region') for (const f of njwh.filter(f => f.level === 'region' && f.place === 1 && sameRegion(f) && Number(f.weight) === b.weight)) {
        check.region_champs++
        const ours = b.places.get(1)
        if (ours && norm(ours) === norm(f.name)) check.region_match++; else check.region_differ.push(`Region ${G === 'F' ? GIRLS_REGION[ev.num!] : ev.num} ${b.weight}: NJWH ${f.name} / file ${ours ?? '—'}`)
      }
    }
  }
  const summary = { files: events.flatMap(e => e.files).length, pdf: pdfs[0] ?? null, events: counts, bouts: bouts.length, entrants: entrants.length, dates: Object.fromEntries(events.map(e => [`${e.kind}${e.num ?? ''}`, [...new Set(e.rows.map(r => r.date))]])), sites: Object.fromEntries(events.map(e => [`${e.kind}${e.num ?? ''}`, [...new Set(e.rows.map(r => r.city))].join(', ')])), check }
  // replace this season's staged rows (only while it isn't loaded)
  const cur = chk(await db.from('playoff_history_seasons').select('status').eq('season_id', year).eq('gender', G), 'season')
  if (cur[0]?.status === 'loaded') { console.log(`${year}: already loaded — not restaged`); continue }
  for (const t of ['playoff_history_bouts', 'playoff_history_entrants']) chk(await db.from(t).delete().eq('season_id', year).eq('gender', G), `clear ${t}`)
  for (let i = 0; i < bouts.length; i += 1000) chk(await db.from('playoff_history_bouts').insert(bouts.slice(i, i + 1000)), 'bouts')
  for (let i = 0; i < entrants.length; i += 1000) chk(await db.from('playoff_history_entrants').insert(entrants.slice(i, i + 1000)), 'entrants')
  chk(await db.from('playoff_history_seasons').upsert({ season_id: year, gender: G, status: 'staged', summary, problems, staged_at: new Date().toISOString() }, { onConflict: 'season_id,gender' }), 'season row')
  console.log(`${year}: ${counts.district ?? 0} districts, ${counts.region ?? 0} regions, ${counts.state ? 'state' : 'NO STATE'} | ${bouts.length} bouts, ${entrants.length} entrants | NJWH: state ${check.state_match}/${check.state_placers}, region champs ${check.region_match}/${check.region_champs} | problems ${problems.length}`)
}

// team names → schools (Kyle's decisions stay)
const existing = new Map(chk(await db.from('playoff_history_schools').select('raw_name, decision, seasons, decided_by').eq('gender', G), 'schools').map(r => [r.raw_name, r]))
const kept: { raw_name: string; seasons: number[] }[] = []   // Kyle's calls: only their seasons change
const upserts = [...teamSeen].map(([raw, t]) => {
  const old = existing.get(raw)
  const seasons = [...new Set([...(old?.seasons ?? []), ...t.seasons])].sort()
  if (old && old.decided_by) { kept.push({ raw_name: raw, seasons }); return null }
  const p = pickSchool(raw, m)
  return { gender: G, raw_name: raw, seasons, school_id: p.school_id, decision: p.decision, suggestion: p.suggestion, note: p.coop ? 'co-op' : null }
})
const fresh = upserts.filter(<T,>(u: T | null): u is T => u !== null)
for (let i = 0; i < fresh.length; i += 500) chk(await db.from('playoff_history_schools').upsert(fresh.slice(i, i + 500), { onConflict: 'gender,raw_name' }), 'schools')
for (const k of kept) chk(await db.from('playoff_history_schools').update({ seasons: k.seasons }).eq('gender', G).eq('raw_name', k.raw_name), 'kept seasons')
// a wrong match shows as two spellings on one school wrestling in different districts (girls: regions) the same season
const unit = G === 'F' ? 'Region' : 'District'
const named = chk(await db.from('playoff_history_schools').select('raw_name, school_id, decision, note').eq('gender', G), 'schools')
const bySchoolYear = new Map<string, { raw: string; at: number }[]>()
for (const n of named) {
  if (n.school_id == null || n.decision === 'placeholder') continue
  for (const [y, nums] of teamSeen.get(n.raw_name)?.at ?? []) for (const at of nums) (bySchoolYear.get(`${n.school_id}|${y}`) ?? bySchoolYear.set(`${n.school_id}|${y}`, []).get(`${n.school_id}|${y}`)!).push({ raw: n.raw_name, at })
}
const flags = new Map<string, string[]>()
for (const [k, list] of bySchoolYear) {
  if (new Set(list.map(x => x.at)).size < 2 || new Set(list.map(x => x.raw)).size < 2) continue
  const y = Number(k.split('|')[1])
  // only different spellings: one name in two places is the school's own wrestlers (girls 2019 split some schools across North and South)
  for (const x of list) for (const o of list.filter(o => o.at !== x.at && o.raw !== x.raw)) (flags.get(x.raw) ?? flags.set(x.raw, []).get(x.raw)!).push(`same school as “${o.raw}” (${unit} ${o.at}) in ${y - 1}-${String(y).slice(2)}, this one ${unit} ${x.at}`)
}
for (const n of named) {
  const base = (n.note ?? '').split('; ').filter(x => x && !x.startsWith('same school as') && !x.startsWith('back then')).join('; ')
  const f = [...new Set(flags.get(n.raw_name) ?? [])]
  const note = [base, ...f].filter(Boolean).join('; ') || null
  if (note !== n.note) chk(await db.from('playoff_history_schools').update({ note }).eq('gender', G).eq('raw_name', n.raw_name), 'note')
}
const c: Record<string, number> = { kyle: kept.length }; for (const u of fresh) c[u.decision] = (c[u.decision] ?? 0) + 1
console.log('team names', upserts.length, c, '| flagged (one school, two districts the same season)', flags.size, [...flags.keys()].slice(0, 12).join('; '))
