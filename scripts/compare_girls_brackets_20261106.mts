// Girls postseason brackets: the source files (Match Data/2025|2026 Girls * Data.py) vs the stored bouts.
// Read-only. Lists every source win not stored (by tournament and round), the first step before testing
// the girls team-scoring rules (the boys rules were proven only after their brackets were complete).
//   npx tsx --tsconfig tsconfig.json scripts/compare_girls_brackets_20261106.mts [--list]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LIST = process.argv.includes('--list')
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const RND: [RegExp, string][] = [[/^Champ\. Round 1/, 'R1'], [/^Champ\. Round 2/, 'R2'], [/^Quarterfinal/, 'QF'], [/^Semifinal/, 'SF'], [/^1st Place/, 'F'], [/^3rd Place/, '3rd_Place'], [/^5th Place/, '5th_Place'], [/^7th Place/, '7th_Place'], [/^Cons\. Round 1/, 'C1'], [/^Cons\. Round 2/, 'C2'], [/^Cons\. Round 3/, 'C3'], [/^Cons\. Round 4/, 'C4'], [/^Cons\. Round 5/, 'C5'], [/^Cons\. Semi/, 'CS'], [/^Quarterfinal/, 'QF']]
const FILES: [string, number, string, (h: string) => string | null][] = [
  ['../Whizzer Upload/Match Data/2026 Girls District Data.py', 2026, 'districts', h => (h.match(/^District (\d+)$/) ? `Girl_s Districts District ${h.match(/\d+/)![0]}` : null)],
  ['../Whizzer Upload/Match Data/2026 Girls Region Data.py', 2026, 'girls_regions', h => (h.match(/^Region (\d+)$/) ? `Girl_s Regions r${h.match(/\d+/)![0]}` : null)],
  ['../Whizzer Upload/Match Data/2026 Girls State Data.py', 2026, 'girls_state', () => null],
  ['../Whizzer Upload/Match Data/2025 Girls Region Data.py', 2025, 'girls_regions', h => (h.match(/^(Region|District) (\d+)$/) ? `#${h.match(/\d+/)![0]}` : null)],
  ['../Whizzer Upload/Match Data/2025 Girls State Data.py', 2025, 'girls_state', () => null],
]
const tours = (await db.from('tournaments').select('id, name, tournament_type, season_id').eq('gender', 'F')).data!
let grand = 0
for (const [file, season, type, head] of FILES) {
  const ts = tours.filter(t => t.season_id === season && t.tournament_type === type).sort((a, b) => a.id - b.id)
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  let cur: any = ts.length === 1 ? ts[0] : null
  const src: { t: any; round: string; win: string; lose: string; line: string }[] = []
  for (const raw of lines) {
    const l = raw.trim(); const h = head(l)
    if (h) { cur = h.startsWith('#') ? ts[Number(h.slice(1)) - 1] : ts.find(t => t.name === h) ?? null; continue }
    if (!cur || !/ won (by|in) /.test(l)) continue
    const r = RND.find(([re]) => re.test(l)); if (!r) continue
    const m = l.match(/ - (.+?) \(.*?\) [\d-]+ won (?:by|in) .*? over (.+?) \(/); if (!m) continue
    src.push({ t: cur, round: r[1], win: m[1], lose: m[2], line: l })
  }
  for (const t of ts) {
    const ents = new Map((await all((f, to) => db.from('tournament_entries').select('id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to))).map((e: any) => [e.id, n(e.wrestlers.first_name + e.wrestlers.last_name)]))
    const ms = await all((f, to) => db.from('matches').select('round, winner_entry_id, loser_entry_id').eq('tournament_id', t.id).range(f, to))
    const used = new Set<number>()
    const mine = src.filter(s => s.t?.id === t.id)
    const missing = mine.filter(s => { const i = ms.findIndex((m, k) => !used.has(k) && ents.get(m.winner_entry_id) === n(s.win) && (!m.loser_entry_id || ents.get(m.loser_entry_id) === n(s.lose))); if (i < 0) return true; used.add(i); return false })
    grand += missing.length
    const by: any = {}; for (const s of missing) by[s.round] = (by[s.round] ?? 0) + 1
    console.log(`${season} ${t.name.replace('Girl_s ', '')}: source wins ${mine.length}, stored ${ms.length}, missing ${missing.length} ${JSON.stringify(by)}`)
    if (LIST) for (const s of missing) console.log('     ', s.line.slice(0, 170))
  }
}
console.log('total source wins not stored:', grand)
