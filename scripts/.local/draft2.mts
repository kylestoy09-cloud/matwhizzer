import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const d = (await db.from('rtf_import_drafts').select('id, label, created_at, updated_at, status, wrestler_overrides, text').gte('updated_at', '2026-08-30').lte('updated_at', '2026-09-12').order('updated_at')).data ?? []
console.log('drafts 8/30–9/12:', d.length)
const names = ['Aaliyah Gordon Burke', 'Hunter Sedita Lott', 'Sabrina Jean Baptiste', 'Tiffany Guanoquiza Restrepo', 'Perla Huerta Vasquez', 'Perla Huerta-Vasquez', 'Ellis Beaumont Torres', 'Ellis Beaumont-Torres', 'Isabella Silva Chijindu', 'Mariana CEPEDA - MOREL']
for (const x of d) {
  const ov = x.wrestler_overrides ?? {}
  for (const [k, v] of Object.entries(ov)) if (names.some(n => k.startsWith(n + '|'))) console.log(`${x.updated_at.slice(0, 16)} "${x.label}" ${x.status}: ${k} → ${JSON.stringify(v)}`)
  for (const n of names) if (!Object.keys(ov).some(k => k.startsWith(n + '|')) && (x.text ?? '').includes(n)) console.log(`${x.updated_at.slice(0, 16)} "${x.label}" ${x.status}: ${n} in text, no override`)
}
