// Girls 2024-25 postseason, step 2 (2026-11-09): add the region Round 1 losers' entries (and three others),
// then write the bout migration. Reads docs/reviews/girls_2025_region_r1_plan.json (scripts/plan_girls_2025_region_r1.mts),
// where every wrestler is resolved by the rules and Kyle's calls; nothing there is open.
//   without --apply: checks and prints what it would do
//   --apply: (service role) creates the new profiles (inactive, gender F, no grade: none has 2025-26 records, as the
//            boys on 2026-11-05), their name links at the school, and the 266 entries; backs up every new row's id;
//            then writes docs/migrations/20261109_girls_2025_r1_bouts.sql for the bouts (bouts are written in the SQL editor).
//   npx tsx --tsconfig tsconfig.json scripts/apply_girls_2025_region_r1.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
// --resume: the entries already exist (a run stopped partway on 2026-11-09: Keyra Huastitlan Reyes was planned as a
// new profile at both Central and State); only write the bout migration, from what's stored
const RESUME = process.argv.includes('--resume')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const norm = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const FILLER = /^(|([A-Z*] )?Forfeit( [A-Z]| Forfeit)?|Bye( Bye)?)$/i
const plan = JSON.parse(fs.readFileSync('docs/reviews/girls_2025_region_r1_plan.json', 'utf8'))
const wcs = new Map(chk(await db.from('weight_classes').select('id, weight').eq('gender', 'F'), 'wc').map(w => [w.weight, w.id]))
const problems: string[] = []

if (!RESUME) {
// 1. checks: no entry yet for these wrestlers in these tournaments (any weight), profiles exist, girls
const tids = [...new Set(plan.entries.map((e: any) => e.tournament_id))] as number[]
const existing = new Map<number, any[]>()
for (const t of tids) existing.set(t, await all((f, to) => db.from('tournament_entries').select('id, wrestler_id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', t).range(f, to)))
for (const e of plan.entries) {
  const ex = existing.get(e.tournament_id)!
  if (ex.some((x: any) => x.weight_class_id === wcs.get(e.weight) && norm(`${x.wrestlers?.first_name}${x.wrestlers?.last_name}`) === norm(e.name))) problems.push(`${e.name} ${e.weight}: already has an entry here`)
  if (e.wrestler_id) {
    // her profile already entered at this weight under a shortened or variant name ("Layla Lubrano-Lava"): reuse it
    const same = ex.filter((x: any) => x.wrestler_id === e.wrestler_id)
    if (same.length === 1 && same[0].weight_class_id === wcs.get(e.weight)) { e.reuse_entry = same[0].id }
    else if (same.length) problems.push(`${e.name} ${e.weight}: her profile already has an entry in tournament ${e.tournament_id} at another weight`)
    const w = chk(await db.from('wrestlers').select('id, gender').eq('id', e.wrestler_id), 'w')[0]
    if (!w || w.gender !== 'F') problems.push(`${e.name}: profile ${e.wrestler_id} missing or not a girl`)
  }
}
const newOnes = plan.entries.filter((e: any) => !e.wrestler_id), reused = plan.entries.filter((e: any) => e.reuse_entry)
console.log(`entries ${plan.entries.length}: reuse an existing entry ${reused.length} (${reused.map((e: any) => e.name).join(', ')}); new entries ${plan.entries.length - reused.length} (existing profiles ${plan.entries.length - newOnes.length - reused.length}, new profiles ${newOnes.length}); bouts ${plan.bouts.length}; problems ${problems.length}`)
if (problems.length) { console.log(problems.join('\n')); process.exit(1) }
if (!APPLY) { console.log('checks passed; run with --apply'); process.exit(0) }

// 2. create (service role), recording every new id
const made: { wrestlers: string[]; aliases: number[]; entries: string[] } = { wrestlers: [], aliases: [], entries: [] }
const backup = 'docs/migrations/backups/20261109_girls_2025_r1_created.json'
const save = () => fs.writeFileSync(backup, JSON.stringify(made, null, 1))
try {
  for (const e of plan.entries) {
    if (e.reuse_entry) { e.entry_id = e.reuse_entry; continue }
    let wid = e.wrestler_id
    if (!wid) {
      const parts = e.name.trim().split(/\s+/)
      const w = chk(await db.from('wrestlers').insert({ first_name: parts[0], last_name: parts.slice(1).join(' '), gender: 'F', is_active: false, is_oos: false }).select('id'), 'wrestler')[0]
      wid = w.id; made.wrestlers.push(wid); e.wrestler_id = wid
    }
    // a name link at her school for every new profile and every decided match (Dozier, Arvo); the rest are linked already
    if (!e.how.startsWith('linked')) {
      const have = chk(await db.from('wrestler_name_aliases').select('id').eq('wrestler_id', wid).eq('school_id', e.school_id).eq('raw_name', e.name), 'alias?')
      if (!have.length) { const a = chk(await db.from('wrestler_name_aliases').insert({ raw_name: e.name, school_id: e.school_id, wrestler_id: wid }).select('id'), 'alias')[0]; made.aliases.push(a.id) }
    }
    const en = chk(await db.from('tournament_entries').insert({ wrestler_id: wid, tournament_id: e.tournament_id, school_id: e.school_id, weight_class_id: wcs.get(e.weight), seed: null, wins: 0, losses: 0, school_context_raw: e.school, team_points: 0 }).select('id'), 'entry')[0]
    made.entries.push(en.id); e.entry_id = en.id
    save()
  }
} finally { save() }
console.log(`created: ${made.wrestlers.length} profiles, ${made.aliases.length} name links, ${made.entries.length} entries (ids: ${backup})`)
}
const backupFile = 'docs/migrations/backups/20261109_girls_2025_r1_created.json'
const made2 = JSON.parse(fs.readFileSync(backupFile, 'utf8'))

// 3. the bout migration: every bout's two entries now exist
const ent = new Map<number, any[]>()
for (const t of [...new Set(plan.bouts.map((b: any) => Number(b.tournament)))] as number[]) ent.set(t, await all((f, to) => db.from('tournament_entries').select('id, weight_class_id, wrestler_id, wrestlers(first_name, last_name)').eq('tournament_id', t).range(f, to)))
const entryOf = (t: number, w: number, name: string) => { const c = ent.get(t)!.filter((x: any) => x.weight_class_id === wcs.get(w) && norm(`${x.wrestlers?.first_name}${x.wrestlers?.last_name}`) === norm(name)); return c.length === 1 ? c[0].id : null }
// decided names: the export name differs from the profile name
// export names that differ from the profile name (decided matches, reused entries, shortened profile names):
// the entry of the planned profile at that tournament and weight
const alias = new Map<string, string>()
for (const e of plan.entries) if (e.wrestler_id) { const c = ent.get(e.tournament_id)?.filter((x: any) => x.weight_class_id === wcs.get(e.weight) && x.wrestler_id === e.wrestler_id) ?? []; if (c.length === 1) alias.set(`${e.tournament_id}|${e.weight}|${norm(e.name)}`, c[0].id) }
const byKey = (t: number, w: number, n: string) => alias.get(`${t}|${w}|${norm(n)}`) ?? entryOf(t, w, n)
function result(d: string) {
  const time = (s: string) => { const [mm, ss] = s.split(':').map(Number); return mm * 60 + ss }
  let m: RegExpMatchArray | null
  if ((m = d.match(/^(?:SV-1|TB-1|UTB|SV-2) \(Fall\) (\d+:\d+)/))) return ['FALL', null, null, time(m[1])]
  if ((m = d.match(/^Fall (\d+:\d+)/))) return ['FALL', null, null, time(m[1])]
  // the label as TrackWrestling printed it: TF-1 and TF-1.5 are the same tech fall, never relabelled
  if ((m = d.match(/^(TF-1\.5|TF-1) (\d+:\d+)(?:.*?(\d+)-(\d+))?/))) return [m[1], m[3] ? Number(m[3]) : null, m[4] ? Number(m[4]) : null, time(m[2])]
  if ((m = d.match(/^MD (\d+)-(\d+)/))) return ['MD', Number(m[1]), Number(m[2]), null]
  if ((m = d.match(/^Dec (\d+)-(\d+)/))) return ['DEC', Number(m[1]), Number(m[2]), null]
  if ((m = d.match(/^SV-2 (\d+)-(\d+)/))) return ['2-OT', Number(m[1]), Number(m[2]), null]
  if ((m = d.match(/^(SV-1|TB-1|UTB) (\d+)-(\d+)/))) return [m[1], Number(m[2]), Number(m[3]), null]
  if (/^(For\.|M\. For\.)/.test(d)) return ['FORF', null, null, null]
  if (/^Inj\./.test(d)) return ['INJ', null, null, null]
  if (/^DQ/.test(d)) return ['DQ', null, null, null]
  return null
}
const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const rows: string[] = [], bad: string[] = []
for (const b of plan.bouts) {
  const t = Number(b.tournament), W = byKey(t, b.weight, b.win), L = FILLER.test(b.lose) ? null : byKey(t, b.weight, b.lose), r = result(b.result)
  if (!W || (!L && !FILLER.test(b.lose)) || !r) { bad.push(`${t} ${b.weight} ${b.round}: ${b.line.slice(0, 120)}`); continue }
  rows.push(`    -- ${t} ${b.weight} ${b.round}: ${b.line.replace(/^[^-]+ - /, '').replace(/'/g, '').slice(0, 110)}\n    (${t}, ${wcs.get(b.weight)}, '${b.side}', '${b.round}', '${W}', ${q(L)}, '${r[0]}', ${q(r[1])}, ${q(r[2])}, ${q(r[3])}, true)`)
}
if (bad.length) { console.log('bouts not resolved:\n' + bad.join('\n')); process.exit(1) }
const sql = `-- Girls 2024-25 postseason, step 2: the region Round 1 bouts and three others (2026-11-09)
--
-- The 2024-25 girls regions were loaded from Round 2 on, and the Round 1 losers were never entered. Their
-- entries (and profiles where needed: ${made2.wrestlers.length} new, inactive) were added by scripts/apply_girls_2025_region_r1.mts
-- (ids: ${backupFile}); these are their bouts, from the TrackWrestling exports. ${rows.length} bouts:
-- region Round 1, plus the three step-1 bouts that waited on an entry (State Round 1 185, Central 3rd place 165 / 185).
-- ROLLBACK: DELETE FROM matches WHERE winner_entry_id IN (the new entries) OR loser_entry_id IN (the new entries);
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id IN (134, 135, 136, 137) AND round = 'R1') THEN
    RAISE EXCEPTION 'region Round 1 bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
${rows.join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} bouts, got %', n; END IF;
END $$;

-- Verify: Round 1 per region, and the three others
SELECT t.name, m.round, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE (m.tournament_id IN (134, 135, 136, 137) AND m.round = 'R1') OR (m.tournament_id = 138 AND m.round = 'R1') OR (m.tournament_id = 134 AND m.round = '3rd_Place')
GROUP BY t.name, m.round ORDER BY t.name, m.round;
`
fs.writeFileSync('docs/migrations/20261109_girls_2025_r1_bouts.sql', sql)
console.log(`wrote docs/migrations/20261109_girls_2025_r1_bouts.sql (${rows.length} bouts)`)
