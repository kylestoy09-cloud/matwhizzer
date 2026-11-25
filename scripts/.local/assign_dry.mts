import { createClient } from '@supabase/supabase-js'
import { assignPeople } from '../../src/lib/playoffHistory/identity'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log(JSON.stringify(await assignPeople(db as never, process.argv.includes('--girls') ? 'F' : 'M', true)))
