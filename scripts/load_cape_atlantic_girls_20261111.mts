// 2026-11-11 — Cape Atlantic League Tournament (girls, 2/6/2026, Buena), from "2025-26 - Girls February Tournament.rtf".
// The league used its own weights; Kyle approved the nearest NJ class: 121→120, 128→126, 135→132, 143→145,
// 151→152, 161→165, 180→185. Track's team views label some bouts with the neighboring weight (Zanghi at 132
// and 135, Tennant and Grace at 143 and 145), so 132/135 and 143/145 are one bracket each. Exodus Hollander's
// "1st Place Match over Unknown (For.)" under 143 is left out: it would be a second 145 champion with no opponent.
// Same parser, matchers and row shapes as src/app/api/admin/rtf/import/route.ts.
//   npx tsx --tsconfig tsconfig.json scripts/load_cape_atlantic_girls_20261111.mts <february_tournament.txt> [--apply <backup.json>]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseRtfText, normalizeRound, boutResultToDb } from '../src/lib/parseRtf'
import { matchSchoolNames } from '../src/lib/matchSchools'
import { matchWrestler, reloadAliases } from '../src/lib/matchWrestlers'
import { isPlaceholderName, stripNickname } from '../src/lib/personName'

const [src, flag, backupPath] = process.argv.slice(2)
const APPLY = flag === '--apply'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TID = 'e9c7a4cc-7cee-4424-89d5-19fa627282f6'
const MAP: Record<string, string> = { '121': '120', '128': '126', '135': '132', '143': '145', '151': '152', '161': '165', '180': '185' }
const SKIP = (b: { wrestler1_name: string; wrestler2_name: string }) => b.wrestler1_name === 'Exodus Hollander' && isPlaceholderName(b.wrestler2_name)

// only the Cape Atlantic section, weights mapped, "Varsity - " (a repeat of the same bout) dropped
const lines = fs.readFileSync(src, 'utf8').split('\n')
const start = lines.findIndex(l => l.startsWith('Cape Atlantic League Girls Tournament - '))
let end = lines.findIndex((l, i) => i > start && / - \d{1,2}\/\d{1,2}\/\d{4}\s*$/.test(l) && !l.startsWith('Cape Atlantic'))
if (end < 0) end = lines.length
const section = lines.slice(start, end).map(l => {
  const t = l.replace(/ /g, ' ').trim()
  if (/^\d{3}$/.test(t) && MAP[t]) return MAP[t]
  return l.replace(/^(\s*)Varsity - /, '$1')
})
const t = parseRtfText(section.join('\n'))[0]
if (!t || !/cape atlantic/i.test(t.name)) throw new Error('Cape Atlantic section not parsed')

const seen = new Set<string>()
const bouts = t.bouts.filter(b => {
  if (SKIP(b)) return false
  const key = `${b.weight_class}|${normalizeRound(b.round)}|${b.result_type}|${b.result_detail ?? ''}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
  if (seen.has(key)) return false
  seen.add(key); return true
})

await reloadAliases()
const schools = new Map<string, { id: number; name: string }>()
for (const b of bouts) for (const raw of [b.wrestler1_school, b.wrestler2_school]) {
  if (!raw || schools.has(raw)) continue
  const m = await matchSchoolNames(raw, { gender: 'F', seasonId: 2026 })
  if (!m.schoolId || m.confidence !== 'exact') throw new Error(`school "${raw}": ${m.confidence} ${m.displayName}`)
  schools.set(raw, { id: m.schoolId, name: m.displayName! })
}
const wr = new Map<string, { id: string | null; conf: string; matched?: string | null }>()
for (const b of bouts) for (const [n, s] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
  if (!s || isPlaceholderName(n)) continue
  const k = `${n}|${schools.get(s)!.id}`; if (wr.has(k)) continue
  const r = await matchWrestler(n, schools.get(s)!.id, b.weight_class, 'F')
  wr.set(k, { id: r.wrestlerId, conf: r.confidence, matched: r.displayName })
}
const low = [...wr.entries()].filter(([, v]) => v.id && v.conf !== 'exact' && v.conf !== 'high')
const fresh = [...wr.entries()].filter(([, v]) => !v.id)
const byW: Record<number, number> = {}; for (const b of bouts) byW[b.weight_class] = (byW[b.weight_class] ?? 0) + 1
console.log('bouts', bouts.length, byW, 'schools', schools.size, 'wrestlers', wr.size, 'low', low, 'new', fresh.map(f => f[0]))
const pl = t.placements.filter(p => !(p.wrestler_name === 'Exodus Hollander'))
console.log('placements', pl.length, pl.map(p => `${p.weight_class}-${p.place} ${p.wrestler_name}`).join('; '))
if (low.length) throw new Error('low-confidence wrestler matches: decide before applying')
if (!APPLY) process.exit(0)

const { count } = await db.from('tournament_bouts_girls').select('*', { count: 'exact', head: true }).eq('in_season_tournament_id', TID)
if (count) throw new Error(`tournament already has ${count} bouts`)
const saved: any = { wrestlers: [], aliases: [], bouts: [], placements: [] }
const save = () => fs.writeFileSync(backupPath, JSON.stringify(saved, null, 1))
for (const [k, v] of fresh) {
  const [name, sid] = k.split('|')
  const parts = stripNickname(name).split(/\s+/)
  const ins = await db.from('wrestlers').insert({ first_name: parts.slice(0, -1).join(' '), last_name: parts.at(-1), gender: 'F', is_oos: false }).select('id').single()
  if (ins.error) throw ins.error
  v.id = ins.data.id; saved.wrestlers.push(v.id); save()
  const al = await db.from('wrestler_name_aliases').insert({ raw_name: name, school_id: Number(sid), wrestler_id: v.id }).select('id').single()
  if (!al.error) saved.aliases.push(al.data.id)
}
const rows = []
for (const b of bouts) {
  const r = boutResultToDb(b.result_type, b.result_detail)
  if (r.db_type === null && r.winner === null) continue
  const s1 = schools.get(b.wrestler1_school), s2 = schools.get(b.wrestler2_school)
  const w1 = s1 && !isPlaceholderName(b.wrestler1_name) ? wr.get(`${b.wrestler1_name}|${s1.id}`)!.id : null
  const w2 = s2 && !isPlaceholderName(b.wrestler2_name) ? wr.get(`${b.wrestler2_name}|${s2.id}`)!.id : null
  const forfeitOverSlot = r.db_type === 'Forfeit' && r.winner === 1 && !!w1 && isPlaceholderName(b.wrestler2_name)
  if ((!w1 || !w2) && !forfeitOverSlot) { console.log('skipped (no profile)', b); continue }
  rows.push({
    in_season_tournament_id: TID, weight_class: b.weight_class, round: normalizeRound(b.round),
    wrestler1_name_raw: b.wrestler1_name, wrestler1_school_raw: s1?.name ?? b.wrestler1_school, wrestler1_school_id: s1?.id ?? null, wrestler1_id: w1,
    wrestler2_name_raw: b.wrestler2_name, wrestler2_school_raw: s2?.name ?? b.wrestler2_school, wrestler2_school_id: s2?.id ?? null, wrestler2_id: w2,
    winner: r.winner, result_type: r.db_type, result_detail: r.db_detail, fall_time_seconds: r.fall_time_seconds,
    result_time_estimated: r.result_time_estimated, winner_score: r.winner_score, loser_score: r.loser_score, source_format: 'rtf',
  })
}
const ib = await db.from('tournament_bouts_girls').insert(rows).select('id')
if (ib.error) throw ib.error
saved.bouts = ib.data.map(r => r.id); save()
const plRows = []
const seenPl = new Set<string>()
for (const p of pl) {
  const k = `${p.weight_class}|${p.place}`; if (seenPl.has(k)) continue; seenPl.add(k)
  const s = schools.get(p.school_name)
  const w = s ? wr.get(`${p.wrestler_name}|${s.id}`) : undefined
  plRows.push({ in_season_tournament_id: TID, weight_class: p.weight_class, place: p.place, bracket: p.bracket, wrestler_name_raw: p.wrestler_name, school_name_raw: p.school_name, school_id: s?.id ?? null, wrestler_id: w?.id ?? null })
}
const ip = await db.from('tournament_placements').insert(plRows).select('id')
if (ip.error) throw ip.error
saved.placements = ip.data.map(r => r.id); save()
await db.from('in_season_tournaments_girls').update({ source_format: t.source_format, venue_name: 'Buena Regional High School', venue_address: '125 Weymouth Road, Buena, NJ 08310', location: 'Buena Regional High School, 125 Weymouth Road, Buena, NJ 08310' }).eq('id', TID)
console.log('applied', { wrestlers: saved.wrestlers.length, bouts: saved.bouts.length, placements: saved.placements.length })
