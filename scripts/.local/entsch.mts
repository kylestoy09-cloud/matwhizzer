import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const key = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026)
const ents: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('tournament_entries').select('id, wrestler_id, school_id, school_context_raw, tournament_id').in('tournament_id', ts!.map(t => t.id)).range(f, f + 999); ents.push(...data!); if (data!.length < 1000) break }
const names = new Map<string, Set<number>>(); const put = (n: string, id: number) => { const k = key(n); names.set(k, (names.get(k) ?? new Set()).add(id)) }
for (const s of (await db.from('schools').select('id, display_name')).data!) put(s.display_name, s.id)
for (const s of (await db.from('girls_schools').select('school_id, display_name')).data!) put(s.display_name, s.school_id)
for (const a of (await db.from('school_aliases').select('school_id, alias').limit(10000)).data!) put(a.alias, a.school_id)
// raw text → the school most entries with that text point at
const rawTo = new Map<string, Map<number, number>>()
for (const e of ents) if (e.school_context_raw && e.school_id != null) { const k = key(e.school_context_raw); const m = rawTo.get(k) ?? new Map(); m.set(e.school_id, (m.get(e.school_id) ?? 0) + 1); rawTo.set(k, m) }
const odd: string[] = []
for (const e of ents) {
  if (!e.school_context_raw || e.school_id == null) continue
  const m = rawTo.get(key(e.school_context_raw))!; const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const named = names.get(key(e.school_context_raw))
  if ((m.size > 1 && e.school_id !== top) || (named && named.size === 1 && !named.has(e.school_id)))
    odd.push(`${ts!.find(t => t.id === e.tournament_id)!.name.replace("Girl_s ", '')}: raw "${e.school_context_raw}" → school ${e.school_id} (most entries with this text: ${top}${named ? `; name = ${[...named]}` : ''}) entry ${e.id.slice(0, 8)}`)
}
console.log(ents.length, 'girls 2025-26 entries;', odd.length, 'whose school disagrees with their school text'); console.log(odd.join('\n'))
