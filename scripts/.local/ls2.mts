import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = (await db.from('wrestlers').select('id').eq('first_name', 'Lerrod').eq('last_name', 'Smalls').eq('is_active', false)).data![0].id
const r = await db.from('wrestlers').update({ is_oos: false }).eq('id', id).select('id, is_oos')
console.log('Bridgewater-Raritan Lerrod Smalls:', JSON.stringify(r.data), r.error?.message ?? '')
