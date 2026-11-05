import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const all = (await db.from('wrestlers').select('id, first_name, last_name, created_at').eq('gender', 'F').limit(5000)).data!
for (const n of ['Aaliyah Gordon Burke', 'Hunter Sedita Lott', 'Sabrina Jean Baptiste', 'Tiffany Guanoquiza Restrepo', 'Perla Huerta Vasquez', 'Ellis Beaumont Torres', 'Isabella Silva Chijindu', 'Evellyn De Castro Barbosa', 'Mariana Cepeda Morel']) {
  const ws = all.filter((w: any) => key(`${w.first_name}${w.last_name}`) === key(n))
  const out = []
  for (const w of ws) {
    const t = (await db.from('tournament_bouts_girls').select('created_at, source_format, wrestler1_id, wrestler1_name_raw, wrestler2_name_raw').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`).order('created_at').limit(1)).data?.[0]
    const raw = t ? (t.wrestler1_id === w.id ? t.wrestler1_name_raw : t.wrestler2_name_raw) : null
    out.push(`"${w.first_name}|${w.last_name}" created ${w.created_at.slice(0, 10)}${raw ? ` (first tournament name "${raw}" ${t!.source_format} ${t!.created_at.slice(0, 10)})` : ''}`)
  }
  console.log(out.join('  ⟷  '))
}
