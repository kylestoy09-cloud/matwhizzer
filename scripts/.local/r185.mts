import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: e } = await db.from('tournament_entries').select('id, wrestler_id, wrestlers(first_name,last_name)').eq('tournament_id', 181).eq('weight_class_id', (await db.from('weight_classes').select('id').eq('weight', 185).eq('gender', 'F').single()).data!.id)
for (const x of e! as any[]) if (/Nava|Silia/.test(x.wrestlers.last_name)) {
  const { data: st } = await db.from('tournament_entries').select('tournaments(name)').eq('wrestler_id', x.wrestler_id)
  console.log(x.wrestlers.first_name, x.wrestlers.last_name, (st as any[]).map(s => s.tournaments.name).join(', '))
}
