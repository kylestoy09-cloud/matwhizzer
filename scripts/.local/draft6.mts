import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const ws = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, created_at').eq('gender', 'F').order('id').range(f, t))
const tb = await all((f, t) => db.from('tournament_bouts_girls').select('wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, created_at').order('id').range(f, t))
const dm = await all((f, t) => db.from('dual_meet_matches_girls').select('wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, created_at').order('id').range(f, t))
const te = await all((f, t) => db.from('tournament_entries').select('wrestler_id, school_id').order('id').range(f, t))
for (const [id, cutoff] of [['be2375ec-c95b-452a-90c3-e84c1d6e764e', '2026-09-10T03:18:03'], ['9f7d4026-15d6-42a1-8968-a2eef489f332', '2026-09-10T03:40:09']]) {
  const ov = Object.keys((await db.from('rtf_import_drafts').select('wrestler_overrides').eq('id', id)).data![0].wrestler_overrides) as string[]
  // who was on record at each school before the review began
  const at = new Map<string, Set<number>>()
  const put = (w: string | null, s: number | null) => { if (w && s) (at.get(w) ?? at.set(w, new Set()).get(w)!).add(s) }
  for (const b of tb) if (b.created_at < cutoff) { put(b.wrestler1_id, b.wrestler1_school_id); put(b.wrestler2_id, b.wrestler2_school_id) }
  for (const b of dm) if (b.created_at < cutoff) { put(b.wrestler_a_id, b.school_a_id); put(b.wrestler_b_id, b.school_b_id) }
  for (const e of te) put(e.wrestler_id, e.school_id)
  let existed = 0; const ex: string[] = []
  for (const k of ov) {
    const [name, sid] = k.split('|')
    const hit = ws.find((w: any) => w.created_at < cutoff && key(`${w.first_name}${w.last_name}`) === key(name) && at.get(w.id)?.has(Number(sid)))
    if (hit) { existed++; ex.push(`${name}→"${hit.first_name}|${hit.last_name}"`) }
  }
  console.log(`${id.slice(0, 8)}: ${ov.length} created; ${existed} already had a same-name profile on record at that school`)
  console.log('   ', ex.join('; '))
}
