// Placements checked against their placing bouts (Kyle 2026-11-20: Powerade 2025-26 had Norwin's Landon Sidun on the
// NJSIAA podium). The RTF importer took a team's side by where its school sat most often across a weight's bouts, not
// in the placing bout, so when the team's wrestler was on the other side of the final it filed the OPPONENT's name
// with the team's school (fixed in src/lib/parseRtf.ts). Every 1st–8th place has a placing bout (F, 3rd_Place,
// 5th_Place, 7th_Place) naming both wrestlers and schools; where a tournament has exactly one such bout for the weight,
// the placement is set to that bout's wrestler (name, school, profile). Anything else is listed, not changed.
// Backup to docs/migrations/backups/. Dry run unless --apply.
//   npx tsx scripts/fix_placements_from_place_bouts_20261120.mts [--apply]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const ROUND_BASE: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }
const placements = await all<any>(f => db.from('tournament_placements').select('*').order('id').range(f, f + 999))
const schools = new Map((await all<any>(f => db.from('schools').select('id, display_name, is_nj').order('id').range(f, f + 999))).map(s => [s.id, s]))
const changes: { before: any; after: Record<string, unknown>; label: string }[] = []
const unclear: string[] = []
for (const [side, tt, bt] of [['Boys', 'in_season_tournaments', 'tournament_bouts'], ['Girls', 'in_season_tournaments_girls', 'tournament_bouts_girls']] as const) {
  const tourns = await all<any>(f => db.from(tt).select('id, name, season').order('id').range(f, f + 999))
  const tName = new Map(tourns.map(t => [t.id, `${t.name} ${t.season}`]))
  const mine = placements.filter(p => tName.has(p.in_season_tournament_id))
  const tIds = [...new Set(mine.map(p => p.in_season_tournament_id))]
  const placeBouts = new Map<string, any[]>()   // tournament|weight|place → bouts that decide it
  for (let i = 0; i < tIds.length; i += 20) {
    const bouts = await all<any>(f => db.from(bt).select('id, in_season_tournament_id, weight_class, round, winner, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler1_school_raw, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, wrestler2_school_raw').in('in_season_tournament_id', tIds.slice(i, i + 20)).in('round', Object.keys(ROUND_BASE)).order('id').range(f, f + 999))
    for (const b of bouts) {
      if (b.winner !== 1 && b.winner !== 2) continue
      const base = ROUND_BASE[b.round]
      for (const [place, s] of [[base, b.winner], [base + 1, b.winner === 1 ? 2 : 1]] as const) {
        const k = `${b.in_season_tournament_id}|${b.weight_class}|${place}`
        ;(placeBouts.get(k) ?? placeBouts.set(k, []).get(k)!).push({ id: s === 1 ? b.wrestler1_id : b.wrestler2_id, name: s === 1 ? b.wrestler1_name_raw : b.wrestler2_name_raw, school_id: s === 1 ? b.wrestler1_school_id : b.wrestler2_school_id, school_raw: s === 1 ? b.wrestler1_school_raw : b.wrestler2_school_raw, oppSchool: s === 1 ? b.wrestler2_school_id : b.wrestler1_school_id })
      }
    }
  }
  let checked = 0, ok = 0, fix = 0, njFlips = 0
  for (const p of mine) {
    const cands = placeBouts.get(`${p.in_season_tournament_id}|${p.weight_class}|${p.place}`)
    if (!cands) continue
    checked++
    // the same bout can be stored twice (once per team's file): one wrestler is one wrestler
    const distinct = [...new Map(cands.map(c => [c.id ?? `${c.name}|${c.school_raw}`, c])).values()]
    if (distinct.length !== 1) { unclear.push(`${side} ${tName.get(p.in_season_tournament_id)} ${p.weight_class} #${p.place} (${p.bracket || 'no bracket'}): ${distinct.length} possible wrestlers — placement says ${p.wrestler_name_raw} (${p.school_name_raw})`); continue }
    const c = distinct[0]
    if (c.id === p.wrestler_id && c.school_id === p.school_id) { ok++; continue }
    if (!c.id) { unclear.push(`${side} ${tName.get(p.in_season_tournament_id)} ${p.weight_class} #${p.place}: the placing bout's wrestler has no profile (${c.name}, ${c.school_raw})`); continue }
    const label = `${side} ${tName.get(p.in_season_tournament_id)} ${p.weight_class} #${p.place}: ${p.wrestler_name_raw} (${p.school_name_raw} → ${schools.get(p.school_id)?.display_name ?? p.school_id}) vs bout ${c.name} (${c.school_raw} → ${schools.get(c.school_id)?.display_name ?? c.school_id})`
    // The importer bug: the placement carries a school from another team's file (the opponent's, or the team whose
    // report it was) under the right wrestler. Fixed only when it's the same wrestler and the placement and the bout
    // name different schools. Listed for review instead: a different wrestler, or one school name matched to two
    // school records (Dover, DE → Dover (DE) on one, Dover on the other — the bout can be the wrong one there).
    const sameWrestler = !p.wrestler_id || c.id === p.wrestler_id
    const namesDiffer = (schools.get(p.school_id)?.display_name ?? '') !== (schools.get(c.school_id)?.display_name ?? '')
    const rawDiffer = String(p.school_name_raw ?? '').trim().toLowerCase() !== String(c.school_raw ?? '').trim().toLowerCase()
    if (!sameWrestler || !namesDiffer || !rawDiffer) { unclear.push(`${label}  [${!sameWrestler ? 'different wrestler' : 'same school name, two school records'}]`); continue }
    fix++
    if (schools.get(c.school_id)?.is_nj !== schools.get(p.school_id)?.is_nj) njFlips++
    changes.push({ before: p, after: { wrestler_id: c.id, wrestler_name_raw: c.name, school_id: c.school_id, school_name_raw: c.school_raw }, label })
  }
  console.log(`${side}: ${mine.length} placements; ${checked} have a placing bout — ${ok} match, ${fix} to correct (${njFlips} change NJ / non-NJ), ${unclear.filter(u => u.startsWith(side)).length} unclear`)
}
// Dover Holiday Tournament 2025-26 (an NJ event): the source labeled Dover's team "Dover, DE"; the bouts link those
// wrestlers to Dover (NJ, school 61) — every one is a Dover NJ wrestler (e.g. Leo Lorenzo's 27 duals are all for Dover)
// — but the placements linked Dover (DE) (608). Those placements move to Dover (NJ).
{
  const { data: dt } = await db.from('in_season_tournaments').select('id').eq('name', 'Dover Holiday Tournament').eq('season', '2025-26')
  for (const t of dt ?? []) for (const p of placements.filter(x => x.in_season_tournament_id === t.id && x.school_id === 608)) {
    if (changes.some(c => c.before.id === p.id)) continue
    changes.push({ before: p, after: { school_id: 61 }, label: `Boys Dover Holiday Tournament 2025-26 ${p.weight_class} #${p.place}: ${p.wrestler_name_raw} — Dover (DE) → Dover (NJ)` })
    const i = unclear.findIndex(u => u.includes('Dover Holiday') && u.includes(p.wrestler_name_raw)); if (i >= 0) unclear.splice(i, 1)
  }
}
console.log(`\nCorrections (${changes.length}, first 12):`); for (const c of changes.slice(0, 12)) console.log('  ' + c.label)
console.log(`\nFor review (${unclear.length}):`); for (const u of unclear) console.log('  ' + u)
if (APPLY) {
  writeFileSync('docs/migrations/backups/20261120_placements_before_place_bout_fix.json', JSON.stringify(changes.map(c => c.before), null, 1))
  for (const c of changes) { const { error } = await db.from('tournament_placements').update(c.after).eq('id', c.before.id); if (error) throw new Error(`${c.before.id}: ${error.message}`) }
  console.log(`\napplied ${changes.length} (backup: docs/migrations/backups/20261120_placements_before_place_bout_fix.json)`)
} else console.log('\ndry run')
