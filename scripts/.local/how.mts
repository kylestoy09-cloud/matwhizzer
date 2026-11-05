import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = ['Aaliyah Gordon Burke','Amaya Harmon','Ana Molina','Arianna Sottile','Ayah Khashashina','Emily Garcia','Gabriella Conte','Gabriella Weinstein','Isabella Brinzo','Madison McKoy','Perjia Dupont','Rachel Springer','Rainen Clark','Samirah Duron','Sofia Pedroso','Sofia Sgalambro','Sophia Klecha','Sophia Parzero','Tiffanis Mexica','Xiomora Alvarez','Kassandr Lucero','Niah']
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const all = (await db.from('wrestlers').select('id, first_name, last_name, created_at').eq('gender', 'F').limit(5000)).data!
for (const n of names) {
  const ws = all.filter((w: any) => key(`${w.first_name}${w.last_name}`) === key(n))
  for (const w of ws) {
    const al = (await db.from('wrestler_name_aliases').select('id').eq('wrestler_id', w.id)).data?.length
    if (al) continue
    const e = (await db.from('tournament_entries').select('created_at').eq('wrestler_id', w.id).order('created_at').limit(1)).data?.[0]?.created_at
    const t = (await db.from('tournament_bouts_girls').select('created_at, source_format').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`).order('created_at').limit(1)).data?.[0]
    const d = (await db.from('dual_meet_matches_girls').select('created_at').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`).order('created_at').limit(1)).data?.[0]?.created_at
    console.log(`${w.first_name}|${w.last_name} created ${w.created_at.slice(0, 16)} | first entry ${e?.slice(0, 16) ?? '-'} | first tourn bout ${t?.created_at?.slice(0, 16) ?? '-'} ${t?.source_format ?? ''} | first dual bout ${d?.slice(0, 16) ?? '-'}`)
  }
}
