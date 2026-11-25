import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('mixed_hub_tournaments').select('id').eq('name', 'USAW-NJ Freestyle & Greco State Championships (Youth / 14U)').single()
await db.from('mixed_hub_events').update({ notes: "Not placed: 12U Boys Freestyle 67 (the bout file joins its freestyle and Greco draws; Flo's copy has no 12U)." }).eq('tournament_id', t!.id)
console.log('ok')
