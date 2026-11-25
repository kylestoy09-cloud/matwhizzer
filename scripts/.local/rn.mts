import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const s of [2025, 2026]) for (const ty of ['districts', 'regions', 'boys_state']) {
  const tids = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', s).eq('tournament_type', ty)).data!.map((t: any) => t.id)
  const ms: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from('matches').select('round, bracket_side').in('tournament_id', tids).range(i, i + 999)).data!; ms.push(...d); if (d.length < 1000) break }
  const c: Record<string, number> = {}; for (const m of ms) c[`${m.bracket_side[0]}:${m.round}`] = (c[`${m.bracket_side[0]}:${m.round}`] ?? 0) + 1
  console.log(s, ty, JSON.stringify(c))
}
for (const f of ['district_team_pts', 'region_postseason_pts', 'lb_p_wrestler_points']) {
  const r = await db.rpc(f, f === 'lb_p_wrestler_points' ? { p_gender: 'M', p_pool: 'state', p_season: 2026 } : f === 'district_team_pts' ? { p_district: 8, p_gender: 'M', p_season: 2026 } : { p_region: 2, p_gender: 'M', p_season: 2026 })
  console.log(f, r.error?.message ?? `${(r.data ?? []).length} rows; columns ${Object.keys((r.data ?? [])[0] ?? {}).join(',')}`)
}
