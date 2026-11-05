// Backfill missing name links (2026-11-05, approved by Kyle). An active NJ wrestler who wrestled
// for an NJ school in 2025-26 (duals, in-season tournaments, postseason entries) but has no name
// link at that school is missing from the roster tools (grade %, Roster Grade Import, microcheck).
// Cause: the tournament imports saved links only for created or picked wrestlers (fixed the same
// day, src/lib/nameLinks.ts), and the 2026-07-25 backfill read dual bouts only.
// Adds a link only for a wrestler with no link at any school, using the name as written on her
// bouts there (else the profile name). Listed, not changed: wrestlers linked at another school
// (transfer or wrong match), and names at the school already linked to someone else.
//   npx tsx --tsconfig tsconfig.json scripts/fix_name_links_backfill_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const names = new Map((await db.from('schools').select('id, display_name, is_nj')).data!.map((r: any) => [r.id, r]))
const aliases = await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id, raw_name').order('id').range(f, t))
const linkAt = new Set(aliases.map((a: any) => `${a.wrestler_id}|${a.school_id}`))
const linked = new Set(aliases.map((a: any) => a.wrestler_id))
const owner = new Map(aliases.map((a: any) => [`${a.raw_name}|${a.school_id}`, a.wrestler_id]))
const add: any[] = [], held: string[] = []
for (const g of ['F', 'M'] as const) {
  const ws = new Map((await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, is_active, is_oos').eq('gender', g).order('id').range(f, t))).map((w: any) => [w.id, w]))
  const raws = new Map<string, Map<string, number>>()   // wrestler|school → raw name counts
  const put = (w: string | null, s: number | null, raw: string | null) => { if (!w || !s) return; const k = `${w}|${s}`; const m = raws.get(k) ?? new Map(); const r = (raw ?? '').trim(); if (r) m.set(r, (m.get(r) ?? 0) + 1); raws.set(k, m) }
  const ist = new Set((await db.from(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id))
  for (const b of await all((f, t) => db.from(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, wrestler1_name_raw, wrestler2_name_raw').order('id').range(f, t)))
    if (ist.has(b.in_season_tournament_id)) { put(b.wrestler1_id, b.wrestler1_school_id, b.wrestler1_name_raw); put(b.wrestler2_id, b.wrestler2_school_id, b.wrestler2_name_raw) }
  const meetIds = new Set((await all((f, t) => { let q = db.from(g === 'F' ? 'dual_meets_girls' : 'dual_meets').select('id').eq('season_id', 2026); if (g === 'M') q = q.eq('gender', 'M'); return q.order('id').range(f, t) })).map((m: any) => m.id))
  for (const b of await all((f, t) => db.from(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, wrestler_a_name_raw, wrestler_b_name_raw').order('id').range(f, t)))
    if (meetIds.has(b.dual_meet_id)) { put(b.wrestler_a_id, b.school_a_id, b.wrestler_a_name_raw); put(b.wrestler_b_id, b.school_b_id, b.wrestler_b_name_raw) }
  const tours = new Set((await db.from('tournaments').select('id').eq('gender', g).eq('season_id', 2026)).data!.map((t: any) => t.id))
  for (const e of await all((f, t) => db.from('tournament_entries').select('tournament_id, wrestler_id, school_id').order('id').range(f, t))) if (tours.has(e.tournament_id)) put(e.wrestler_id, e.school_id, null)
  let n = 0
  for (const [k, m] of raws) {
    if (linkAt.has(k)) continue
    const [wid, sid] = k.split('|'); const w = ws.get(wid); const s = names.get(Number(sid))
    if (!w || !w.is_active || w.is_oos || w.first_name === 'Unknown' || !s?.is_nj) continue
    const raw = [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `${w.first_name} ${w.last_name}`.trim()
    const who = `${g} ${w.first_name} ${w.last_name} @ ${s.display_name}`
    if (linked.has(wid)) { held.push(`${who}: linked at another school`); continue }
    const o = owner.get(`${raw}|${sid}`)
    if (o && o !== wid) { held.push(`${who}: "${raw}" at this school is linked to ${o.slice(0, 8)}`); continue }
    add.push({ raw_name: raw, school_id: Number(sid), wrestler_id: wid, g }); n++
  }
  console.log(`${g}: add ${n}`)
}
console.log(`held ${held.length}:`); for (const h of held) console.log('  ', h)
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_name_links_backfill_added.json', JSON.stringify({ added: add, held }, null, 1))
const rows = add.map(({ g, ...r }) => r)
for (let i = 0; i < rows.length; i += 200) { const { error } = await db.from('wrestler_name_aliases').upsert(rows.slice(i, i + 200), { onConflict: 'raw_name,school_id', ignoreDuplicates: true }); if (error) throw new Error(error.message) }
console.log(`APPLIED: ${rows.length} links`)
