import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const terms = process.argv.slice(2)
const { data: names } = await db.from('playoff_history_schools').select('gender, raw_name, decision, school_id, suggestion').or(terms.map(t => `raw_name.ilike.*${t}*`).join(','))
const { data: schools } = await db.from('schools').select('id, display_name')
const sn = new Map((schools ?? []).map(s => [s.id, s.display_name]))
for (const n of (names ?? []).sort((a, b) => a.raw_name.localeCompare(b.raw_name))) {
  const { data: ents } = await db.from('playoff_history_entrants').select('season_id, kind, num, weight, name, place').eq('gender', n.gender).eq('team', n.raw_name).order('season_id').limit(400)
  const where = [...new Set((ents ?? []).filter(e => e.kind === 'district').map(e => `${e.season_id - 1}-${String(e.season_id).slice(2)} D${e.num}`))]
  const people = new Map<string, string[]>()
  for (const e of ents ?? []) { const k = e.name; const v = `${e.season_id - 1}-${String(e.season_id).slice(2)} ${e.kind === 'state' ? 'State' : e.kind === 'region' ? `R${e.num}` : `D${e.num}`} ${e.weight}${e.place ? ` (${e.place}${['th', 'st', 'nd', 'rd'][e.place] ?? 'th'})` : ''}`; (people.get(k) ?? people.set(k, []).get(k)!).push(v) }
  console.log(`\n${n.gender === 'F' ? 'GIRLS' : 'BOYS'} "${n.raw_name}" — ${n.decision}${n.school_id ? ` → ${sn.get(n.school_id)}` : ''}${n.suggestion ? ` (suggested ${sn.get(n.suggestion)})` : ''} | districts: ${where.join(', ') || '—'}`)
  for (const [p, v] of [...people].slice(0, 8)) console.log(`   ${p}: ${v.slice(0, 4).join(' · ')}`)
  if (people.size > 8) console.log(`   … ${people.size - 8} more wrestlers`)
}
