import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = Date.now()
const r = await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('opponent_wrestler_id', 'c246fadc-f6df-4ca4-9e36-74c5034133b1')
console.log('opponent count', r.count, r.error?.message ?? '', `${Date.now() - t}ms`)
