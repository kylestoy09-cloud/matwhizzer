import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids = new Set<number>(); for (let f = 0; ; f += 1000) { const { data } = await db.from('tournament_entries').select('school_id').not('school_id', 'is', null).order('id').range(f, f + 999); data!.forEach(r => ids.add(r.school_id)); if (data!.length < 1000) break }
const { data: s } = await db.from('schools').select('id, display_name, short_name, logo_url').in('id', [...ids])
console.log('postseason schools', s!.length, 'with short_name', s!.filter(x => x.short_name).length, 'with logo', s!.filter(x => x.logo_url).length)
console.log(s!.filter(x => x.short_name).slice(0, 12).map(x => `${x.display_name} → ${x.short_name}`).join('\n'))
console.log('no logo:', s!.filter(x => !x.logo_url).map(x => `${x.id} ${x.display_name}`).join('; '))
