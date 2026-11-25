// Whether a printed team name IS an NJ school's name — its display name or one of its saved aliases, ignoring case and
// punctuation — rather than an "exact" match the school matcher made by dropping words (Kyle 2026-11-21: Powerade's
// "Franklin Regional", a Pennsylvania school, came out as NJ Franklin once "Regional" was dropped). The history import
// takes a literal match as NJ; any other needs two of the team's wrestlers already on file at that school.
import type { SupabaseClient } from '@supabase/supabase-js'

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export async function literalNjNames(db: SupabaseClient): Promise<(name: string, schoolId: number) => boolean> {
  const names = new Map<number, Set<string>>()
  const add = (id: number, n: string) => (names.get(id) ?? names.set(id, new Set()).get(id)!).add(norm(n))
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('schools').select('id, display_name, short_name').eq('is_nj', true).order('id').range(f, f + 999)
    for (const s of data ?? []) { add(s.id, s.display_name); if (s.short_name) add(s.id, s.short_name) }
    if (!data || data.length < 1000) break
  }
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('school_aliases').select('id, school_id, alias').order('id').range(f, f + 999)
    for (const a of data ?? []) if (names.has(a.school_id)) add(a.school_id, a.alias)
    if (!data || data.length < 1000) break
  }
  return (name, schoolId) => names.get(schoolId)?.has(norm(name)) ?? false
}
