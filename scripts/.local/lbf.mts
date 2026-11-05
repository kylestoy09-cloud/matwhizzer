import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data, error } = await db.rpc('lb_ps_refresh', { p_gender: 'F', p_season: 2026 }); console.log('F lb_ps_refresh', error?.message ?? JSON.stringify(data))
