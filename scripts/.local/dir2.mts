import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const s of [2026]) for (const g of ['M','F']) { const { data, error } = await db.rpc('school_directory', { p_gender: g, p_season: s }); console.log(s, g, error?.message, (data ?? []).length, (data ?? []).filter((r: any) => /saint|\bst\b/i.test(r.school)).map((r: any) => r.school)) }
for (const t of ['boys_schools','girls_schools']) { const { data } = await db.from(t).select('school_id, display_name').or('display_name.ilike.saint%,display_name.ilike.st %,display_name.ilike.% st %'); console.log(t, data) }
