import { createClient } from '@supabase/supabase-js'
import { schoolsOfWrestlers } from '../../src/lib/hubSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ids: string[] = []
for (const t of ['boys_prospects', 'girls_prospects', 'mixed_prospects']) {
  for (let f = 0; ; f += 1000) { const { data } = await db.from(t).select('wrestler_id').not('wrestler_id', 'is', null).order('id').range(f, f + 999); ids.push(...(data ?? []).map(r => r.wrestler_id)); if ((data ?? []).length < 1000) break }
}
const uniq = [...new Set(ids)]
// the old rule: newest name link
const old = new Map<string, number>(), at = new Map<string, string>()
for (let i = 0; i < uniq.length; i += 300) {
  const { data } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id, created_at').in('wrestler_id', uniq.slice(i, i + 300))
  for (const r of data ?? []) if (r.school_id && (!at.has(r.wrestler_id) || r.created_at > at.get(r.wrestler_id)!)) { old.set(r.wrestler_id, r.school_id); at.set(r.wrestler_id, r.created_at) }
}
const { data: sc } = await db.from('schools').select('id, display_name'); const sn = new Map((sc ?? []).map(s => [s.id, s.display_name]))
const t0 = Date.now(); const now = await schoolsOfWrestlers(db as any, uniq); const ms = Date.now() - t0
const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name').in('id', uniq.slice(0, 1)); void ws
const diff = uniq.filter(w => (old.has(w) ? sn.get(old.get(w)!) : undefined) !== now.get(w))
console.log('linked wrestlers', uniq.length, '| school changes', diff.length, `| ${ms} ms`)
const names = new Map<string, string>()
for (let i = 0; i < diff.length; i += 300) { const { data } = await db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', diff.slice(i, i + 300)); for (const w of data ?? []) names.set(w.id, `${w.first_name} ${w.last_name} (${w.graduation_year})`) }
for (const w of diff) console.log(`  ${names.get(w)}: ${old.has(w) ? sn.get(old.get(w)!) : '—'} → ${now.get(w) ?? '—'}`)
