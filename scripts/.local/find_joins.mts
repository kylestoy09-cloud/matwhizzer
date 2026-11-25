import { createClient } from '@supabase/supabase-js'
import { findCandidates } from '../../src/lib/playoffHistory/identity'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const g = process.argv.includes('--girls') ? 'F' : 'M'
const t = Date.now()
console.log(g, JSON.stringify(await findCandidates(db as never, g)), `${Math.round((Date.now() - t) / 1000)}s`)
