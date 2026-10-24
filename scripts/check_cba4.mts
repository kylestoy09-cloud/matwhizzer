import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data: all197 } = await db.from('wrestler_name_aliases').select('id, raw_name, wrestler_id, created_at').eq('school_id', 197).order('raw_name')
console.log(`Total aliases for school 197: ${all197?.length}`)
for (const a of all197 ?? []) console.log(`${a.raw_name} | wrestler_id=${a.wrestler_id} | created=${a.created_at}`)

console.log('\n--- Cross-school check for the "odd" wrestler_ids ---')
const oddIds = [
  'e80f253d-1615-4aa5-b61f-c4955901507a','405672d1-9ae9-47f8-b093-5e3dbf94d1a0','e597e8e2-71af-41d2-82e0-7d5a9e96bf4c',
  '668b827a-9ba0-491f-abc4-668bd3f4132b','aa290ffe-7982-40f3-991b-31d25cb61d4f','363f2311-9d12-4085-b318-10f0fc99a4a5',
  '83bc2d71-7bfe-406d-b8fc-297008a44688','87d792c5-7831-4b64-a974-06ff10987c01','c43d87ec-9223-4dab-9225-eca8e008234f',
  'fc6bae1e-3523-4cc5-a6ab-48e2085fdb31','0a4e3499-c428-483e-b341-112bd0314338','11a0220b-ef09-45a2-af45-b1e0b772a107',
  'cecbf95f-08c0-466e-b94f-6adb3b1b7332','597a0497-0c4b-4643-be42-8c9298bf7425','ff24c1c1-d0aa-480a-b821-f075e27a4684',
  'f65ea887-5bdc-4d43-9abf-dc229f18ac07','42d8838d-40cc-486c-8a40-1c5e71ac2d95','972089f9-5a2b-4e99-9dc2-1bf015722a5a',
  '87199084-3f94-41cd-b6a8-a111bc6d8a56',
]
for (const id of oddIds) {
  const { data: aliases } = await db.from('wrestler_name_aliases').select('school_id, raw_name').eq('wrestler_id', id)
  const schoolIds = [...new Set((aliases ?? []).map(a => a.school_id))]
  const { data: schools } = await db.from('schools').select('id, display_name').in('id', schoolIds)
  console.log(`${id}: aliases=${JSON.stringify(aliases)} schools=${(schools ?? []).map(s => `${s.display_name}(${s.id})`).join(', ')}`)
}
