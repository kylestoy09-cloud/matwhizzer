// In-season tournament placements rebuilt from the stored placing bouts (2026-11-09, Kyle: "rebuild placements").
// No girls in-season tournament had any placements (they were cascade-deleted in the gender-table split, see
// 20260913_fix_tournament_placements_fk.sql, and never reloaded); 7 boys tournaments had none either.
// For each tournament with no placements: per weight, the Finals winner/loser = 1st/2nd, 3rd_Place = 3rd/4th,
// 5th_Place = 5th/6th, 7th_Place = 7th/8th. A place match is used only when the weight has exactly one such bout
// (after dropping exact duplicates), it has a winner, and nobody appears in two place matches at that weight;
// anything else is listed and skipped. Sam Cali is left to 20261109_sam_cali_brackets.sql. Add-only.
//   npx tsx --tsconfig tsconfig.json scripts/rebuild_tournament_placements_20261109.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const SKIP = new Set(['d046f392-9128-4755-8584-528ca5336281', 'ca6174aa-a4e2-4092-be6f-774813d2e6bb'])
const PLACE: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }
const rows: any[] = [], skipped: string[] = [], summary: string[] = []
for (const [g, tt, bt] of [['girls', 'in_season_tournaments_girls', 'tournament_bouts_girls'], ['boys', 'in_season_tournaments', 'tournament_bouts']] as const) {
  const { data: ts } = await db.from(tt).select('id, name').order('start_date')
  for (const t of ts ?? []) {
    if (SKIP.has(t.id)) continue
    const { count } = await db.from('tournament_placements').select('*', { count: 'exact', head: true }).eq('in_season_tournament_id', t.id)
    if (count) continue
    const { data: bouts, error: be } = await db.from(bt).select('id, weight_class, round, winner, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler1_school_raw, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, wrestler2_school_raw').eq('in_season_tournament_id', t.id).in('round', Object.keys(PLACE)).limit(5000)
    if (be) throw new Error(`${t.name}: ${be.message}`)
    let n = 0
    const weights = [...new Set((bouts ?? []).map(b => b.weight_class))].sort((a, b) => a - b)
    for (const w of weights) {
      const used = new Map<string, string>(), add: any[] = []
      let bad = ''
      for (const r of Object.keys(PLACE)) {
        const bs = (bouts ?? []).filter(b => b.weight_class === w && b.round === r)
        const uniq = [...new Map(bs.map(b => [[b.wrestler1_id ?? b.wrestler1_name_raw, b.wrestler2_id ?? b.wrestler2_name_raw].sort().join('|') + b.winner, b])).values()]
        if (!uniq.length) continue
        if (uniq.length > 1) { bad = `${uniq.length} ${r} bouts`; break }
        const b = uniq[0]
        if (b.winner !== 1 && b.winner !== 2) { bad = `${r} has no winner`; break }
        for (const [k, place] of [[b.winner, PLACE[r]], [3 - b.winner, PLACE[r] + 1]] as const) {
          const key = (b as any)[`wrestler${k}_id`] ?? (b as any)[`wrestler${k}_name_raw`]
          if (!key) { bad = `${r} missing a wrestler`; break }
          if (used.has(key)) { bad = `${(b as any)[`wrestler${k}_name_raw`]} in ${used.get(key)} and ${r}`; break }
          used.set(key, r)
          add.push({ in_season_tournament_id: t.id, weight_class: w, place, wrestler_id: (b as any)[`wrestler${k}_id`], wrestler_name_raw: (b as any)[`wrestler${k}_name_raw`] ?? '', school_id: (b as any)[`wrestler${k}_school_id`], school_name_raw: (b as any)[`wrestler${k}_school_raw`] ?? '', bracket: '' })
        }
        if (bad) break
      }
      if (bad) { skipped.push(`${g} ${t.name} ${w}: ${bad}`); continue }
      // a champion who lost at this weight means the round labels can't be trusted
      const champ = add.find(x => x.place === 1)
      if (champ?.wrestler_id) {
        const { data: lost } = await db.from(bt).select('round').eq('in_season_tournament_id', t.id).eq('weight_class', w).or(`and(wrestler1_id.eq.${champ.wrestler_id},winner.eq.2),and(wrestler2_id.eq.${champ.wrestler_id},winner.eq.1)`)
        if (lost?.length) { skipped.push(`${g} ${t.name} ${w}: champion ${champ.wrestler_name_raw} lost ${lost.map(l => l.round).join(', ')}`); continue }
      }
      rows.push(...add); n += add.length
    }
    summary.push(`${g} ${t.name}: ${n} placements, ${weights.length} weights${n ? '' : ' (no placing bouts stored)'}`)
  }
}
console.log(summary.join('\n'))
console.log(`\nplacements ${rows.length}; without a profile ${rows.filter(r => !r.wrestler_id).length}; without a school ${rows.filter(r => r.school_id == null).length}`)
if (skipped.length) console.log(`weights skipped ${skipped.length}:\n  ` + skipped.join('\n  '))
if (APPLY) {
  const ids: string[] = []
  for (let i = 0; i < rows.length; i += 500) { const { data, error } = await db.from('tournament_placements').insert(rows.slice(i, i + 500)).select('id'); if (error) throw error; ids.push(...data!.map(d => d.id)) }
  // a second run adds only tournaments still without placements; keep every added id in the one file
  const F = 'docs/migrations/backups/20261109_tournament_placements_added.json'
  fs.writeFileSync(F, JSON.stringify([...(fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : []), ...ids]))
  console.log('added', ids.length)
}
