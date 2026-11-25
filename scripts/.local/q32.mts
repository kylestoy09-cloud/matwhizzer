import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('tournaments').select('id, tournament_type, gender, name').eq('season_id', 2026)
const c: Record<string, number> = {}; for (const x of t!) c[`${x.gender}|${x.tournament_type}`] = (c[`${x.gender}|${x.tournament_type}`] ?? 0) + 1; console.log(c)
for (const tb of ['placements', 'tournament_placements_postseason', 'state_placements']) { const r = await db.from(tb).select('*').limit(1); console.log(tb, r.error?.message ?? Object.keys(r.data?.[0] ?? {}).join(',')) }
const r = await db.from('snapshot_reports').select('report_date, season').order('report_date').limit(3); console.log(r.data)
const s = await db.from('snapshot_streak_state').select('*').limit(1); console.log(Object.keys(s.data?.[0] ?? {}))
