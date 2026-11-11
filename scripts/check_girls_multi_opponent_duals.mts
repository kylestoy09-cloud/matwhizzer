// The flagged girls duals (one wrestler facing two or more opponents at one weight in a plain dual) checked against
// Kyle's TrackWrestling dual files in "Whizzer Upload/2025-26 Girls Data": the source entry with the same date and
// teams, its bouts and its team score, against the stored meet. Read-only.
//   npx tsx --tsconfig tsconfig.json scripts/check_girls_multi_opponent_duals.mts
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const DIR = '../Whizzer Upload/2025-26 Girls Data'
const files = fs.readdirSync(DIR).filter(f => /dual|other/i.test(f) && /\.rtfd?$/.test(f))
type Src = { file: string; a: string; b: string; date: string; bouts: string[]; score: string }
const src: Src[] = []
for (const f of files) {
  const lines = execFileSync('textutil', ['-convert', 'txt', '-stdout', `${DIR}/${f}`]).toString().replace(/\u00a0/g, ' ').split('\n').map(l => l.trim())
  let cur: Src | null = null
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^(.+?) vs\. (.+?) \((\d{1,2})\/(\d{1,2})\/(\d{4})\)$/)
    if (h) { cur = { file: f, a: h[1], b: h[2], date: `${h[5]}-${h[3].padStart(2, '0')}-${h[4].padStart(2, '0')}`, bouts: [], score: '' }; src.push(cur); continue }
    if (!cur) continue
    // a bout line, or a double forfeit (stored as a bout row too)
    if ((/ over | vs\. /.test(lines[i]) && /\(/.test(lines[i])) || lines[i] === 'Double Forfeit') cur.bouts.push(lines[i])
    if (lines[i] === 'Team Score:') cur.score = `${lines[i + 1]}-${lines[i + 2]}`
  }
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const meets = await all((f, t) => db.from('dual_meets_girls').select('id, meet_kind, meet_date, team1_school_id, team2_school_id, team1_school_name_raw, team2_school_name_raw, team1_score, team2_score').order('id').range(f, t))
const bouts = await all((f, t) => db.from('dual_meet_matches_girls').select('dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id').order('id').range(f, t))
const sn = new Map((await all((f, t) => db.from('schools').select('id, display_name').order('id').range(f, t))).map((s: any) => [s.id, s.display_name]))
const byMeet = new Map<string, any[]>(); for (const b of bouts) { const a = byMeet.get(b.dual_meet_id) ?? []; a.push(b); byMeet.set(b.dual_meet_id, a) }
let same = 0
for (const m of meets) {
  if ((m.meet_kind ?? 'dual') !== 'dual') continue
  const bs = byMeet.get(m.id) ?? []
  const opp = new Map<string, Set<string>>()
  for (const b of bs) for (const [me, them] of [[b.wrestler_a_id, b.wrestler_b_id], [b.wrestler_b_id, b.wrestler_a_id]]) { if (!me || !them) continue; const k = `${me}@${b.weight_class}`; const s = opp.get(k) ?? new Set(); s.add(them); opp.set(k, s) }
  if (![...opp.values()].some(s => s.size > 1)) continue
  const names = [m.team1_school_name_raw, m.team2_school_name_raw].map(n => norm(n ?? ''))
  const hits = src.filter(s => s.date === m.meet_date && names.includes(norm(s.a)) && names.includes(norm(s.b)))
  const label = `${m.meet_date} ${sn.get(m.team1_school_id)} vs ${sn.get(m.team2_school_id)}: stored ${bs.length} bouts, ${m.team1_score}-${m.team2_score}`
  if (!hits.length) { console.log(`${label} | NOT IN THE FILES`); continue }
  const h = hits[0], sc = h.score.split('-').map(Number), ok = h.bouts.length === bs.length && ((sc[0] === m.team1_score && sc[1] === m.team2_score) || (sc[1] === m.team1_score && sc[0] === m.team2_score))
  if (ok) same++
  console.log(`${label} | source ${h.bouts.length} bouts, ${h.score}${hits.length > 1 ? ` (${hits.length} entries)` : ''} | ${ok ? 'SAME' : 'DIFFERS'} (${h.file})`)
}
console.log('same as the source', same)
