import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = new Map(((await db.from('tournaments').select('id, gender, season_id, tournament_type')).data ?? []).map((t: any) => [t.id, t]))
const out: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from('precomputed_team_scores').select('tournament_id, tournament_type').order('id').range(i, i + 999)).data!; out.push(...d); if (d.length < 1000) break }
const c: Record<string, number> = {}
for (const r of out) { const t: any = T.get(r.tournament_id); const k = `${t?.gender} ${t?.season_id} tournament=${t?.tournament_type} row=${r.tournament_type}`; c[k] = (c[k] ?? 0) + 1 }
for (const [k, v] of Object.entries(c).sort()) console.log(v, k)
