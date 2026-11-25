import { createClient } from '@supabase/supabase-js'
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const r = await anon.from('girls_dual_status').select('*', { count: 'exact', head: true }); console.log('anon', r.error?.message ?? r.count)
