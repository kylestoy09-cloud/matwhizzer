import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('*', { count: 'exact', head: true }))).count
console.log('girls playoff duals 2025-26', await c('dual_meets_girls', q => q.eq('season_id', 2026).eq('is_playoff', true)))
console.log('boys playoff duals 2025-26', await c('dual_meets', q => q.eq('season_id', 2026).eq('is_playoff', true)))
console.log('girls ties 2025-26', await c('dual_meets_girls', q => q.eq('season_id', 2026).eq('counts_toward_record', true).filter('team1_score', 'eq', 'team2_score')))
const { data: g } = await db.from('dual_meets_girls').select('team1_score,team2_score,meet_kind,counts_toward_record').eq('season_id', 2026).eq('counts_toward_record', true).range(0, 4999)
console.log('girls counted ties', g!.filter(m => m.team1_score === m.team2_score).length, 'partials counted', g!.filter(m => m.meet_kind === 'partial').length)
const { data: sc, error } = await db.from('season_calendar').select('*').limit(500)
const keys = Object.keys(sc?.[0] ?? {}); console.log(error?.message, keys.join(','))
const s27 = (sc ?? []).filter((r: any) => JSON.stringify(r).includes('2027') || r.season_id === 2027)
console.log('2026-27 calendar rows', s27.length, 'girls', s27.filter((r: any) => r.gender === 'F').length, [...new Set(s27.filter((r: any) => r.gender === 'F').map((r: any) => r.event_type))].join(','))
