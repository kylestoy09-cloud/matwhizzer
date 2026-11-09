// Entries whose TrackWrestling school label points to a different school than the one they're stored under
// (2026-11-09). Read-only. Found when the 2024-25 girls Central region had six "West Windsor-Plainsboro South"
// entries stored at North. Each entry's school_context_raw is matched with src/lib/matchSchools.ts (exact or
// alias); a label that matches a different school than school_id is listed with the wrestler's name links.
//   npx tsx --tsconfig tsconfig.json scripts/audit_entry_school_labels.mts <season_id> <M|F>
import { createClient } from '@supabase/supabase-js'
import { matchSchoolNames } from '../src/lib/matchSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [season, gender] = [Number(process.argv[2]), process.argv[3] as 'M' | 'F']
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const tours = (await db.from('tournaments').select('id, name').eq('season_id', season).eq('gender', gender)).data!
const labels = new Map<string, any>()
const out: string[] = []
const coop = new Set(['JFK/Woodbridge/Colonia'])   // a co-op label: its members' entries all belong to the co-op school
for (const t of tours) {
  const ents = await all((f, to) => db.from('tournament_entries').select('id, school_id, school_context_raw, wrestler_id, wrestlers(first_name,last_name), weight_classes(weight)').eq('tournament_id', t.id).range(f, to))
  for (const e of ents) {
    const raw = (e.school_context_raw ?? '').trim(); if (!raw || coop.has(raw)) continue
    if (!labels.has(raw)) labels.set(raw, await matchSchoolNames(raw, { gender, seasonId: season }))
    const m = labels.get(raw)
    if (m?.confidence === 'exact' && m.schoolId && m.schoolId !== e.school_id) {
      const { data: al } = await db.from('wrestler_name_aliases').select('school_id').eq('wrestler_id', e.wrestler_id)
      out.push(`${t.name.replace(/Girl_s |Boy_s /, '')} ${e.weight_classes?.weight} ${e.wrestlers?.first_name} ${e.wrestlers?.last_name}: stored ${e.school_id}, label "${raw}" → ${m.schoolId} (${m.displayName}); name links at ${[...new Set((al ?? []).map((a: any) => a.school_id))].join(',') || 'none'}`)
    }
  }
}
console.log(`${season} ${gender}: entries whose label points to another school: ${out.length}`); console.log(out.join('\n'))
