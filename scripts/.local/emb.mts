import { createClient } from '@supabase/supabase-js'
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data: t } = await anon.from('tournaments').select('id').eq('name', 'Girl_s Districts District 5').eq('gender', 'F').eq('season_id', 2026).maybeSingle()
const r = await anon.from('precomputed_team_scores').select('school_id, total_points, schools(display_name)').eq('tournament_id', t!.id).not('school_id', 'is', null)
console.log(r.error?.message ?? JSON.stringify(r.data!.slice(0, 3)))
const s = await anon.from('school_season_names').select('school_id').limit(1); console.log('season names read:', s.error?.message ?? 'ok')
