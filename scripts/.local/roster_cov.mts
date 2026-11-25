import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const rated = new Set<string>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id').eq('season', '2026-27').eq('gender', g).order('wrestler_id').range(f, f + 999); for (const r of data ?? []) rated.add(r.wrestler_id); if ((data ?? []).length < 1000) break }
  const roster = new Map<string, Set<number>>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('roster_grade_import').select('wrestler_id, school_id').eq('season_id', 2027).eq('gender', g).not('wrestler_id', 'is', null).order('id').range(f, f + 999); for (const r of data ?? []) roster.set(r.wrestler_id, (roster.get(r.wrestler_id) ?? new Set()).add(r.school_id)); if ((data ?? []).length < 1000) break }
  const prev = new Map<string, number>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, school_id').eq('season', '2025-26').eq('gender', g).order('wrestler_id').range(f, f + 999); for (const r of data ?? []) if (r.school_id) prev.set(r.wrestler_id, r.school_id); if ((data ?? []).length < 1000) break }
  let onRoster = 0, multi = 0, moved = 0, prevOnly = 0, none = 0
  for (const id of rated) { const r = roster.get(id); if (r) { onRoster++; if (r.size > 1) multi++; if (prev.get(id) && !r.has(prev.get(id)!)) moved++ } else if (prev.has(id)) prevOnly++; else none++ }
  console.log(g, 'rated', rated.size, '| on 2026-27 roster', onRoster, '(more than one school', multi, '; roster school differs from last season', moved, ') | last season school only', prevOnly, '| neither', none)
}
