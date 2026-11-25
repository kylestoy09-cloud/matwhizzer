import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('history_finishes').select('year, weight, level, place, name, school').or('name.ilike.%Mendez%,name.ilike.%Almeyda%,name.ilike.%Beadling%,name.ilike.%Bouchard%,name.ilike.%Marques%,name.ilike.%Paretti%,name.ilike.%Cholish%,name.ilike.%Mangione%,name.ilike.%Chris Serpico%,name.ilike.%McClave%,name.ilike.%Corrigan%')
for (const r of data ?? []) console.log(r)
