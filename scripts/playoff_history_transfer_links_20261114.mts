// Playoff History: existing (current) wrestlers whose history now includes an earlier school get a name link there,
// as the 2026-11-11 no-alias review did for transfers (Kyle 2026-11-14: "Add name links"), so imports recognize them
// at that school too. The name as the export printed it (wrestler_name_aliases keeps imported text); a printed name
// already linked to another profile at that school is reported, never re-pointed. Backup of the added ids.
//   npx tsx --tsconfig tsconfig.json scripts/playoff_history_transfer_links_20261114.mts [--apply]
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const all = async (t: string, sel: string, f: (q: any) => any = q => q, key = 'id') => { const out: any[] = []; for (let i = 0; ; i += 1000) { const r = await f(db.from(t).select(sel)).order(key).range(i, i + 999); if (r.error) throw new Error(`${t}: ${r.error.message}`); out.push(...r.data); if (r.data.length < 1000) return out } }
const linked = (await all('playoff_history_profiles', 'wrestler_id, gender', q => q.eq('created', false), 'wrestler_id')).map(r => r.wrestler_id)
const aliases = await all('wrestler_name_aliases', 'id, wrestler_id, school_id, raw_name')
const hasAt = new Set(aliases.map(a => `${a.wrestler_id}|${a.school_id}`))
const nameAt = new Map(aliases.map(a => [`${a.raw_name.trim().toLowerCase()}|${a.school_id}`, a.wrestler_id]))
const schools = new Map((await all('playoff_history_schools', 'raw_name, gender, school_id', q => q, 'raw_name')).map(r => [`${r.gender}|${r.raw_name}`, r.school_id]))
const add: { wrestler_id: string; school_id: number; raw_name: string }[] = [], conflicts: string[] = []
const linkedSet = new Set(linked)
for (const e of await all('playoff_history_entrants', 'id, gender, name, team, wrestler_id', q => q.not('wrestler_id', 'is', null))) {
  if (!linkedSet.has(e.wrestler_id)) continue
  // only the transfers: a name link at another school already (the integrity rule's case, 58 on 2026-11-14)
  if (!aliases.some(a => a.wrestler_id === e.wrestler_id)) continue
  const school = schools.get(`${e.gender}|${e.team}`); if (school == null) continue
  if (hasAt.has(`${e.wrestler_id}|${school}`)) continue
  const other = nameAt.get(`${e.name.trim().toLowerCase()}|${school}`)
  if (other && other !== e.wrestler_id) { conflicts.push(`${e.name} @ ${school}: linked to another profile`); continue }
  hasAt.add(`${e.wrestler_id}|${school}`)
  add.push({ wrestler_id: e.wrestler_id, school_id: school, raw_name: e.name.trim() })
}
console.log('name links to add', add.length, '| profiles', new Set(add.map(a => a.wrestler_id)).size, '| conflicts', conflicts.length, conflicts.slice(0, 5))
if (APPLY && add.length) {
  const { data, error } = await db.from('wrestler_name_aliases').insert(add).select('id')
  if (error) throw error
  fs.writeFileSync('docs/migrations/backups/20261114_transfer_name_links.json', JSON.stringify({ added: data!.map(r => r.id) }, null, 1))
  console.log('applied', data!.length)
}
