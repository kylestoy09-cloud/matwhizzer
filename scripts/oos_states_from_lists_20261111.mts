// States for out-of-state schools from Kyle's TrackWrestling team lists (2026-11-11: "Whizzer Upload/2025-26 Girls
// Data/OOS - school lists.rtf", one list per tournament, "School, ST"). Each school is matched by the name its own
// bouts carry at that tournament (the school text TrackWrestling printed), else by its name; the result is compared
// with the state on file. Read-only; writes docs/reviews/oos_states_from_lists.csv.
//   npx tsx --tsconfig tsconfig.json scripts/oos_states_from_lists_20261111.mts
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const text = execFileSync('textutil', ['-convert', 'txt', '-stdout', '../Whizzer Upload/2025-26 Girls Data/OOS - school lists.rtf']).toString()
// list headers → our tournament names
const SECTIONS: Record<string, { table: string; name: string }> = {
  'Girls Beast Of The East': { table: 'girls', name: '4th Annual Girls Beast of the East' },
  'Ralph Wetzel Girls Classic': { table: 'girls', name: 'Ralph Wetzel Girls Classic' },
  'Women of Ironman': { table: 'girls', name: 'Women of Ironman' },
  'Beast of the East 2025': { table: 'boys', name: 'Beast of the East' },
  'IRONMAN': { table: 'boys', name: 'Iron Man Tournament' },
  '2025 Rahway Holiday Tournament': { table: 'boys', name: 'Rahway Holiday Tournament' },
  '2026 Doc Buchanan Invitational': { table: 'boys', name: 'Doc Buchanan' },
  '2026 East Coast Catholic Classic': { table: 'boys', name: '2026 East Coast Catholic Classic' },
}
const norm = (s: string) => s.toLowerCase().replace(/`/g, "'").replace(/[^a-z0-9]/g, '')
const strip = (s: string) => s.replace(/\s*\(([^)]*)\)\s*$/, '').replace(/\s+(High School|H\.?S\.?|Hs|H S|Senior|Sr|Jr\/Sr|School)$/i, '').trim()
const lists = new Map<string, Map<string, { name: string; st: string }>>()
let cur: string | null = null
for (const l of text.split('\n').map(x => x.trim())) {
  if (SECTIONS[l]) { cur = SECTIONS[l].name; lists.set(cur, new Map()); continue }
  const m = l.match(/^(.*),\s*([A-Z]{2})$/)
  if (cur && m) { const e = { name: m[1].trim(), st: m[2] }; lists.get(cur)!.set(norm(e.name), e); lists.get(cur)!.set(norm(strip(e.name)), lists.get(cur)!.get(norm(strip(e.name))) ?? e) }
}
console.log('lists', [...lists].map(([k, v]) => `${k} ${new Set([...v.values()]).size}`).join('; '))
const schools = await all((f, t) => db.from('schools').select('id, display_name').eq('is_nj', false).range(f, t))
const tagOf = (n: string) => n.match(/\(([A-Z]{2})\)$/)?.[1] ?? n.match(/, ([A-Z]{2})\)$/)?.[1] ?? null
const base = (n: string) => n.replace(/\s*\(([A-Z]{2})\)$/, '').replace(/, [A-Z]{2}\)$/, ')')
const raws = new Map<number, Map<string, Set<string>>>()   // school → tournament → raw names
for (const [tt, bt] of [['in_season_tournaments', 'tournament_bouts'], ['in_season_tournaments_girls', 'tournament_bouts_girls']]) {
  const tn = new Map((await all((f, t) => db.from(tt).select('id, name').range(f, t))).map((t: any) => [t.id, t.name]))
  for (const b of await all((f, t) => db.from(bt).select('in_season_tournament_id, wrestler1_school_id, wrestler1_school_raw, wrestler2_school_id, wrestler2_school_raw').range(f, t)))
    for (const [sid, raw] of [[b.wrestler1_school_id, b.wrestler1_school_raw], [b.wrestler2_school_id, b.wrestler2_school_raw]]) {
      const t = tn.get(b.in_season_tournament_id); if (!sid || !raw || !lists.has(t)) continue
      const m = raws.get(sid) ?? new Map(); const s = m.get(t) ?? new Set(); s.add(raw); m.set(t, s); raws.set(sid, m)
    }
}
const out: string[][] = []
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
let agree = 0, differ = 0, fresh = 0, none = 0
for (const s of schools) {
  const found = new Map<string, string>()   // state → evidence
  for (const [t, rs] of raws.get(s.id) ?? []) for (const r of rs) { const e = lists.get(t)!.get(norm(r)) ?? lists.get(t)!.get(norm(strip(r))); if (e) found.set(e.st, `${t}: "${e.name}, ${e.st}"`) }
  if (!found.size) for (const [t, l] of lists) { const e = l.get(norm(base(s.display_name))) ?? l.get(norm(strip(base(s.display_name)))); if (e && (raws.get(s.id)?.has(t) ?? false)) found.set(e.st, `${t}: "${e.name}, ${e.st}" (by name)`) }
  const cur = tagOf(s.display_name)
  if (!found.size) { if (!cur && raws.has(s.id)) { none++; out.push([s.id, s.display_name, '', '', 'not in the lists', [...(raws.get(s.id)?.keys() ?? [])].join('; ')].map(String)) } continue }
  const sts = [...found.keys()]
  const status = sts.length > 1 ? 'two states in the lists' : !cur ? 'new' : cur === sts[0] ? 'agrees' : 'DIFFERS'
  if (status === 'agrees') agree++; else if (status === 'DIFFERS') differ++; else fresh++
  if (status !== 'agrees') out.push([s.id, s.display_name, cur ?? '', sts.join('/'), status, [...found.values()].join('; ')].map(String))
}
fs.writeFileSync('docs/reviews/oos_states_from_lists.csv', ['school_id,school,state_on_file,state_in_lists,status,evidence'].concat(out.map(r => r.map(q).join(','))).join('\n') + '\n')
console.log(`agrees ${agree}; differs ${differ}; new or two states ${fresh}; in a listed tournament but not found ${none}`)
