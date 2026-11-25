import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dry = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const live = new Map<string, any>()
for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, hammer_score, postseason_adjusted, tournament_score, match_score, match_count').eq('season', '2025-26').eq('gender', 'M').order('wrestler_id').range(f, f + 999); for (const r of data ?? []) live.set(r.wrestler_id, r); if ((data ?? []).length < 1000) break }
const off = dry.M.filter((r: any) => Math.abs(Number(live.get(r.wrestler_id)?.hammer_score) - r.hammer_score) > 0.011)
for (const r of off.slice(0, 8)) { const l = live.get(r.wrestler_id); console.log(`dry ps ${r.postseason_adjusted} t ${r.tournament_score} m ${r.match_score} n ${r.match_count} = ${r.hammer_score} | saved ps ${l.postseason_adjusted} t ${l.tournament_score} m ${l.match_score} n ${l.match_count} = ${l.hammer_score}`) }
const parts = { ps: 0, t: 0, m: 0, n: 0 }
for (const r of off) { const l = live.get(r.wrestler_id); if (Math.abs(l.postseason_adjusted - r.postseason_adjusted) > 0.01) parts.ps++; if (Math.abs(l.tournament_score - r.tournament_score) > 0.01) parts.t++; if (Math.abs(l.match_score - r.match_score) > 0.01) parts.m++; if (l.match_count !== r.match_count) parts.n++ }
console.log(off.length, 'differ; by part:', parts, '| max diff', Math.max(...off.map((r: any) => Math.abs(live.get(r.wrestler_id).hammer_score - r.hammer_score))).toFixed(2))
const { data: recent } = await db.from('dual_meets').select('id, updated_at').eq('season_id', 2026).order('updated_at', { ascending: false }).limit(3)
console.log('latest boys dual edit:', recent?.[0]?.updated_at)
