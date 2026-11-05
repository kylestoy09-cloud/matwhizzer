import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const id of ['be2375ec-c95b-452a-90c3-e84c1d6e764e', '9f7d4026-15d6-42a1-8968-a2eef489f332']) {
  const x = (await db.from('rtf_import_drafts').select('wrestler_overrides, label, text').eq('id', id)).data![0]
  const ov = Object.entries(x.wrestler_overrides ?? {}) as [string, any][]
  const by = ov.reduce((m: any, [, v]) => (m[v.type] = (m[v.type] ?? 0) + 1, m), {})
  console.log(id.slice(0, 8), JSON.stringify(by), '| first line:', (x.text ?? '').split('\n')[0].slice(0, 80))
}
