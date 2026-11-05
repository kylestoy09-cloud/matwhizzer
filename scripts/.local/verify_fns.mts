import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const calls: [string, any][] = [
  ['district_bracket', { p_district: 1, p_weight: 150, p_gender: 'M', p_season: 2026 }],
  ['region_bracket', { p_region: 1, p_weight: 150, p_gender: 'M', p_season: 2026 }],
  ['girls_region_bracket', { p_region: '1', p_weight: 120, p_season: 2026 }],
  ['state_bracket', { p_weight: 150, p_gender: 'M', p_season: 2026 }],
  ['region_bracket_entries_v2', { p_region: 1, p_weight: 150, p_gender: 'M', p_season: 2026 }],
  ['girls_region_bracket_entries_v2', { p_region: '1', p_weight: 120, p_season: 2026 }],
  ['state_bracket_entries_v2', { p_weight: 150, p_gender: 'F', p_season: 2026 }],
  ['district_placements', { p_district: 1, p_gender: 'M', p_season: 2026 }],
  ['region_placements', { p_region: 1, p_gender: 'M', p_season: 2026 }],
  ['girls_region_placements', { p_region: '1', p_season: 2026 }],
  ['state_placements', { p_gender: 'M', p_season: 2026 }],
  ['region_district_champs', { p_region: 1, p_weight: 150, p_gender: 'M', p_season: 2026 }],
  ['girls_region_district_champs', { p_region: '1', p_weight: 120, p_season: 2026 }],
  ['district_fastest_pin', { p_district: 1, p_gender: 'M', p_season: 2026 }],
  ['region_fastest_tf', { p_region: 1, p_gender: 'M', p_season: 2026 }],
  ['girls_region_fastest_pin', { p_region: '1', p_season: 2026 }],
  ['district_team_pts', { p_district: 1, p_gender: 'M', p_season: 2026 }],
  ['district_schools', { p_district: 1, p_gender: 'M', p_season: 2026 }],
  ['region_schools', { p_region: 1, p_gender: 'M', p_season: 2026 }],
  ['girls_region_schools', { p_region: '1', p_season: 2026 }],
  ['ghost_champions', { p_season: 2026 }],
  ['bracket_buster_detail', { p_gender: 'M', p_season: 2026 }],
]
for (const [fn, p] of calls) {
  const { data, error } = await db.rpc(fn, p)
  if (error) { console.log('ERR', fn, error.message); continue }
  const rows = data as any[]
  const idCols = Object.keys(rows[0] ?? {}).filter(k => k.endsWith('school_id'))
  const nullIds = rows.filter(r => idCols.some(c => r[c] == null && (r[c.replace('_id', '_name')] != null || r[c.replace('school_id', 'name')] != null))).length
  console.log(fn.padEnd(32), String(rows.length).padStart(4), 'rows', idCols.join(','), 'named-without-id:', nullIds, '| e.g.', rows[0]?.[idCols[0]], rows[0]?.school_name ?? rows[0]?.winner_school_name ?? rows[0]?.school)
}
