import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = Date.now(); const r = await db.rpc('lb_ps_refresh', { p_gender: 'F', p_season: 2026 }); console.log('lb_ps_refresh', r.error?.message ?? 'ok', `${Math.round((Date.now() - t) / 1000)}s`)
