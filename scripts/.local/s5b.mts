import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('school_aliases:', JSON.stringify((await db.from('school_aliases').select('*').or('alias.ilike.east side,alias.ilike.eastside,alias.ilike.%east side%,alias.ilike.%eastside%')).data))
console.log('school_names:', JSON.stringify((await db.from('school_names').select('*').or('school_name.ilike.east side,school_name.ilike.%eastside%,school_name.ilike.%east side%')).data))
console.log('schools:', JSON.stringify((await db.from('schools').select('id, display_name, short_name').in('id', [72, 122])).data))
