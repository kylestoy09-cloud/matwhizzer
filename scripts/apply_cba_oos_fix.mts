import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const oosIds = [
  'e80f253d-1615-4aa5-b61f-c4955901507a', // Cross Alpe
  '405672d1-9ae9-47f8-b093-5e3dbf94d1a0', // Brayden Austin
  'e597e8e2-71af-41d2-82e0-7d5a9e96bf4c', // Logan Backus
  '668b827a-9ba0-491f-abc4-668bd3f4132b', // Benjamin Bernstein
  'aa290ffe-7982-40f3-991b-31d25cb61d4f', // John Bramlett
  '363f2311-9d12-4085-b318-10f0fc99a4a5', // Joshua Brasfield
  '83bc2d71-7bfe-406d-b8fc-297008a44688', // Barrett Buchanan
  '87d792c5-7831-4b64-a974-06ff10987c01', // Luke Burns
  'c43d87ec-9223-4dab-9225-eca8e008234f', // Cooper Combs
  'fc6bae1e-3523-4cc5-a6ab-48e2085fdb31', // Joseph Drewry
  '0a4e3499-c428-483e-b341-112bd0314338', // Ashton Frison
  '11a0220b-ef09-45a2-af45-b1e0b772a107', // Wilson Jamison
  'cecbf95f-08c0-466e-b94f-6adb3b1b7332', // Jack Johnson
  '597a0497-0c4b-4643-be42-8c9298bf7425', // Judd Lawler
  'f65ea887-5bdc-4d43-9abf-dc229f18ac07', // Findley Smout
  '42d8838d-40cc-486c-8a40-1c5e71ac2d95', // Kohlton Vargas
  '972089f9-5a2b-4e99-9dc2-1bf015722a5a', // Payne Walker
  '87199084-3f94-41cd-b6a8-a111bc6d8a56', // Isaiah Waycaster
]

const { data: aliasRows, error: aliasErr } = await db
  .from('wrestler_name_aliases')
  .update({ school_id: 506 })
  .in('wrestler_id', oosIds)
  .eq('school_id', 197)
  .select('id, raw_name, wrestler_id, school_id')

console.log('alias re-home:', aliasErr?.message ?? `${aliasRows?.length} rows updated`)

const { data: wrestlerRows, error: wErr } = await db
  .from('wrestlers')
  .update({ is_oos: true })
  .in('id', oosIds)
  .select('id, first_name, last_name, is_oos')

console.log('is_oos flag:', wErr?.message ?? `${wrestlerRows?.length} rows updated`)
for (const w of wrestlerRows ?? []) console.log(` - ${w.first_name} ${w.last_name}: is_oos=${w.is_oos}`)

// Verify Christian Brothers (197) roster count afterward
const { data: remaining } = await db.from('wrestler_name_aliases').select('wrestler_id').eq('school_id', 197)
console.log(`\nSchool 197 alias count after fix: ${new Set((remaining ?? []).map(r => r.wrestler_id)).size}`)
