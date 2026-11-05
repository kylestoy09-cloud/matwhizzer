import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [d, w, last] of [[1, 114, 'Romero'], [2, 120, 'Fiestas'], [3, 185, 'Vilela'], [5, 132, 'Garcia'], [12, 120, 'Chase']] as const) {
  const { data: t } = await db.from('tournaments').select('id').eq('name', `Girl_s Districts District ${d}`).eq('season_id', 2026).single()
  const { data: wc } = await db.from('weight_classes').select('id').eq('weight', w).eq('gender', 'F').single()
  const { data: e } = await db.from('tournament_entries').select('id, wrestlers(first_name, last_name)').eq('tournament_id', t!.id).eq('weight_class_id', wc!.id)
  const { data: pw } = await db.from('wrestlers').select('id, first_name, last_name').ilike('last_name', `%${last}%`).eq('gender', 'F')
  console.log(`D${d} ${w}: ${e!.length} entries: ${e!.map((x: any) => x.wrestlers.first_name + ' ' + x.wrestlers.last_name).join(', ')}\n   profiles like ${last}: ${pw!.map(x => x.first_name + ' ' + x.last_name).slice(0, 6).join(', ')}`)
}
