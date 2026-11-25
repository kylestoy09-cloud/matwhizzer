import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'M').eq('season_id', 2025)).data!
console.log(t.length, JSON.stringify([...new Set(t.map((x: any) => x.name.replace(/\d+$/, 'N')))]))
const ids = t.map((x: any) => x.id); const n = (await db.from('precomputed_team_scores').select('id', { count: 'exact', head: true }).in('tournament_id', ids)).count
console.log('stored 2024-25 boys rows:', n)
