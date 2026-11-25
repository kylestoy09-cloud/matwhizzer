// lockSeasonDirectory on 2025-26 (already locked): must add nothing and change nothing
import { createClient } from '@supabase/supabase-js'
import { lockSeasonDirectory } from '../../src/lib/lockSeasonDirectory'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) console.log(g, await lockSeasonDirectory(db, g, 2026))
