import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
import { createClient } from '@supabase/supabase-js'
import { schoolsOfWrestlers } from '../../src/lib/hubSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = (await buildOffseasonBoard('M'))!
console.log('board:', b.entries.filter(e => e.name.includes('Rosemeyer')).map(e => `${e.name} ${e.school} ${e.wrestler_id}`))
console.log('lookup:', await schoolsOfWrestlers(db as any, ['9cb36b80-0b92-4842-b50b-4ab2db01cec9']))
const { data } = await db.from('boys_prospects').select('id, first_name, last_name, wrestler_id').ilike('last_name', '%rosemeyer%'); console.log(data)
