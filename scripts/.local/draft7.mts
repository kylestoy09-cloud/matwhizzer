import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const ws = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, created_at').eq('gender', 'F').order('id').range(f, t))
let still = 0, single = 0; const ex: string[] = []
for (const id of ['be2375ec-c95b-452a-90c3-e84c1d6e764e', '9f7d4026-15d6-42a1-8968-a2eef489f332']) {
  const ov = Object.keys((await db.from('rtf_import_drafts').select('wrestler_overrides').eq('id', id)).data![0].wrestler_overrides) as string[]
  for (const k of ov) {
    const name = k.split('|')[0]
    const same = ws.filter((w: any) => key(`${w.first_name}${w.last_name}`) === key(name))
    if (same.length > 1) { still++; if (ex.length < 12) ex.push(`${name}: ${same.map((w: any) => w.created_at.slice(0, 10)).join(' & ')}`) } else single++
  }
}
console.log(`names created in the two imports: today ${single} have one profile, ${still} still have two or more`)
console.log('  ', ex.join('; '))
// were the new profiles from 9/10 03:19/03:41 merged away later?
const created = ws.filter((w: any) => (w.created_at >= '2026-09-10T03:19' && w.created_at < '2026-09-10T03:20') || (w.created_at >= '2026-09-10T03:41' && w.created_at < '2026-09-10T03:42'))
console.log('profiles still existing with those import timestamps:', created.length)
