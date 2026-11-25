import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, c: string) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from(t).select(c).order('id').range(i, i + 999)).data!; o.push(...d); if (d.length < 1000) break } return o }
const W = new Map((await all('wrestlers', 'id, first_name, last_name, gender')).map((w: any) => [w.id, w]))
const al = await all('wrestler_name_aliases', 'id, raw_name, school_id, wrestler_id')
// for each (name, school) with a link, is there a wrestler of the OTHER gender with that exact name who has records at that school?
const ents = await all('tournament_entries', 'id, wrestler_id, school_id')
const atSchool = new Map<string, Set<string>>(); for (const e of ents) { if (!e.school_id) continue; const k = String(e.school_id); (atSchool.get(k) ?? atSchool.set(k, new Set()).get(k))!.add(e.wrestler_id) }
const byName = new Map<string, any[]>(); for (const w of W.values()) { const k = `${w.first_name} ${w.last_name}`.toLowerCase(); (byName.get(k) ?? byName.set(k, []).get(k))!.push(w) }
const clash: string[] = []
for (const a of al) { const owner = W.get(a.wrestler_id); if (!owner) continue; const same = (byName.get(a.raw_name.toLowerCase()) ?? []).filter((w: any) => w.gender !== owner.gender && atSchool.get(String(a.school_id))?.has(w.id)); if (same.length) clash.push(`"${a.raw_name}" @school ${a.school_id}: link → ${owner.gender}, other-gender profile with entries there`) }
console.log('boy/girl same-name-same-school link clashes (postseason-entry evidence):', clash.length, JSON.stringify(clash.slice(0, 5)))
