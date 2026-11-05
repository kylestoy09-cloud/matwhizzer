import { createSupabaseAdmin } from '../../src/lib/supabase/service'
import { getRosterImportSeason } from '../../src/lib/season-context'
const db = createSupabaseAdmin()
for (const g of ['M', 'F'] as const) console.log(g, 'roster season', JSON.stringify(await getRosterImportSeason(db, g)))
