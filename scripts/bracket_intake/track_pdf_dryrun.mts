// Dry run: match each bracket PDF line to a tournament entry, then check every stored championship bout against it.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const draws = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) as Record<string, { title: string; slots: ({ name: string; school: string } | null)[] }>
const season = Number(process.argv[3] ?? 2026)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
const COL: Record<string, number> = { R2: 0, R1: 0, QF: 1, SF: 2, F: 3 }   // 16-line brackets
let ok = 0; const issues: string[] = []; const plan: { entry_id: string; pos: number; label: string }[] = []
for (const [path, d] of Object.entries(draws)) {
  const m = /(Region|District) (\d+) (\d+)/.exec(d.title); if (!m) { issues.push(`no title: ${path}`); continue }
  const kind = m[1], [region, weight] = [Number(m[2]), Number(m[3])], label = `${kind} ${region} ${weight}`
  const [{ data: ents }, { data: bouts }] = await Promise.all([
    kind === 'Region' ? db.rpc('region_bracket_entries_v2', { p_region: region, p_weight: weight, p_gender: 'M', p_season: season }) : Promise.resolve({ data: null }),
    kind === 'Region' ? db.rpc('region_bracket', { p_region: region, p_weight: weight, p_gender: 'M', p_season: season }) : db.rpc('district_bracket', { p_district: region, p_weight: weight, p_gender: 'M', p_season: season }),
  ])
  const B = (bouts ?? []) as any[]
  // districts have no entries list: the wrestlers in its bout rows
  const E = ents ? (ents as any[]) : [...new Map(B.flatMap((x: any) => [[x.winner_entry_id, { entry_id: x.winner_entry_id, wrestler_name: x.winner_name ?? '', school_name: x.winner_school_name ?? '' }], [x.loser_entry_id, { entry_id: x.loser_entry_id, wrestler_name: x.loser_name ?? '', school_name: x.loser_school_name ?? '' }]]).filter(([k]: any) => k)).values()]
  const pos = new Map<string, number>(), probs: string[] = []
  d.slots.forEach((s, i) => {
    if (!s) return
    const full = E.filter(e => norm(e.wrestler_name) === norm(s.name))
    const sameSchool = (e: any) => norm(e.school_name ?? '').slice(0, 5) === norm(s.school).slice(0, 5)
    // TrackWrestling cuts long names short ("Christophe Montana", "Rodriguez-Casta"): each printed part starts the real one
    const parts = (n: string) => n.trim().split(/\s+/)
    const prefix = (e: any) => { const a = parts(s.name), b = parts(e.wrestler_name); return a.length === b.length && a.every((x, i) => norm(b[i]).startsWith(norm(x)) && norm(x).length >= 3) }
    // exact name; else same last name at the same school; else a cut-short name that fits only one wrestler in this
    // bracket (co-ops print differently: "West Morris (Mendham" for Mendham)
    const byLast = E.filter(e => sameSchool(e) && norm(e.wrestler_name.split(' ').slice(-1)[0]) === norm(s.name.split(' ').slice(-1)[0]))
    const last = full.length ? full : byLast.length ? byLast : E.filter(prefix)
    if (last.length !== 1) { probs.push(`line ${i + 1} "${s.name}, ${s.school}": ${last.length} matches`); return }
    if (pos.has(last[0].entry_id)) { probs.push(`line ${i + 1} "${s.name}": entry already on line ${pos.get(last[0].entry_id)! + 1}`); return }
    pos.set(last[0].entry_id, i)
  })
  // an entry that isn't on the bracket is fine only if it never wrestled there (a qualifier who withdrew)
  const wrestled = new Set(B.flatMap((x: any) => [x.winner_entry_id, x.loser_entry_id]))
  const unplaced = E.filter(e => !pos.has(e.entry_id) && wrestled.has(e.entry_id))
  if (unplaced.length) probs.push(`entries with bouts not on the PDF: ${unplaced.map(e => e.wrestler_name).join(', ')}`)
  // every championship bout: both wrestlers in the same block at that round, opposite halves
  let checked = 0
  for (const b of B.filter(x => x.bracket_side === 'championship' && x.winner_entry_id && x.loser_entry_id)) {
    const k = COL[b.round]; if (k == null) { probs.push(`round ${b.round}?`); continue }
    const a = pos.get(b.winner_entry_id), c = pos.get(b.loser_entry_id); if (a == null || c == null) continue
    const size = 2 ** (k + 1)
    if (Math.floor(a / size) !== Math.floor(c / size) || Math.floor(a / (size / 2)) === Math.floor(c / (size / 2))) probs.push(`${b.round} ${b.winner_name} v ${b.loser_name} not where the PDF puts them (lines ${a + 1}, ${c + 1})`)
    else checked++
  }
  if (probs.length) issues.push(`${label}: ${probs.join(' | ')}`)
  else { ok++; for (const [e, p] of pos) plan.push({ entry_id: e, pos: p + 1, label }) }
  if (label === 'District 28 120') console.log(`${label}: ${pos.size} placed, ${checked} bouts agree`, [...pos].sort((x, y) => x[1] - y[1]).map(([e, p]) => `${p + 1}:${E.find(x => x.entry_id === e).wrestler_name}`).join(', '))
}
console.log(`\n${ok} of ${Object.keys(draws).length} brackets fully matched and consistent; ${plan.length} entries would get a bracket position`)
console.log(issues.join('\n'))
fs.writeFileSync(process.argv[4], JSON.stringify(plan, null, 1))
