// Kyle 2026-11-18: "we have all of the super 32 results. let's pull podiums for each season and match to njsiaa
// wrestlers." Super 32 Challenge 2016–2025 (2026 is already in the hub) into the Offseason Hub — places 1–8 of the
// high school boys and high school girls brackets — with each New Jersey placer linked to our wrestler when the match
// is certain.
//
// Source per year (Off Season Stuff/Non-NJSIAA Seasons/Super 32/): the TrackWrestling bout export (CSV) for every
// bout, and the FloWrestling bracket PDF for which bracket is which. The CSV doesn't name divisions (high school,
// middle school, youth and girls brackets share weights); the PDF prints its brackets in a fixed order — the 14 high
// school boys weights first, then middle school (70 lbs up), youth, and the girls last (95–103 lbs up to 195–200) —
// with each page's weight in its footer. A CSV bracket (src/lib/hubFiles.ts: bracketsFrom / placesFrom, the hub's
// own reader) is the boys or girls bracket whose PDF pages carry most of its wrestlers (last name + state).
//
// People: every placer is a prospect (one already on file with the same name and state is reused). A New Jersey
// placer is linked to a wrestler when exactly one wrestler of that side has the name (or an alias of it) and a
// graduation year a high schooler (or an 8th grader) could have that October (season + 1 … + 5, or unknown) — as
// listed, without a suffix, or by a nickname form; otherwise listed for review.
// Season = the year it's held (the hub's offseason key: 2026 = the October 2026 event). Re-runnable: a year whose
// hub event already has placements is skipped. Dry run unless --apply.
//   npx tsx scripts/import_super32_history_20261118.mts [--apply] [year …]
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { parseBoutExport, bracketsFrom, placesFrom, mergedBracket, stateCode, type Bracket } from '../src/lib/hubFiles'
import { splitName, nameKey } from '../src/lib/hub'
import { otherForms } from '../src/lib/nicknames'

const APPLY = process.argv.includes('--apply')
const only = process.argv.slice(2).filter(a => /^\d{4}$/.test(a)).map(Number)
const DIR = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/Non-NJSIAA Seasons/Super 32`
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TOURN = { M: 18, F: 17 }   // "Super 32 Challenge" in boys_ / girls_hub_tournaments
const DIVISION = { M: 'High School Boys', F: 'High School Girls' }
const files = readdirSync(DIR)
const years = [...new Set(files.map(f => Number(f.slice(0, 4))).filter(y => y >= 2016 && y <= 2025))].filter(y => !only.length || only.includes(y)).sort()

const last = (name: string) => splitName(name).last_name.toLowerCase().replace(/[^a-z]/g, '')
const st = (team: string) => stateCode(team.length === 2 ? team.toUpperCase() : team)

/** The PDF's bracket sections: boys = the first run of weights, girls = a later run starting 90+ lbs and ending
 *  190+ (middle school starts at 70, youth lower) — each with the "last|ST" of every wrestler on its pages */
function pdfSections(pdf: string): Record<'M' | 'F', Map<string, Set<string>>> {
  const py = `
import fitz, re, sys, json
d = fitz.open(sys.argv[1]); runs = []; prev = None
for p in d:
    L = [l.strip() for l in p.get_text().split('\\n') if l.strip()]
    w = next((int(re.match(r'^(\\d+)', l).group(1)) for l in reversed(L) if re.match(r'^\\d+ lbs', l)), None)
    if w is None: continue
    # a new run when the weight goes down — or, after the boys (the first run), jumps 30+ lbs (youth 65 → girls 103)
    if prev is None or w < prev or (len(runs) > 1 and w - prev > 30): runs.append([])
    if not runs[-1] or runs[-1][-1][0] != w: runs[-1].append([w, []])
    for l in L:
        m = re.match(r"^(?:\\d+\\s+)?([A-Z][A-Za-z'\`.\\- ]+?)\\s*\\(([A-Za-z]{2})\\)$", l)
        if m: runs[-1][-1][1].append(m.group(1).split()[-1].lower() + '|' + m.group(2).upper())
    prev = w
print(json.dumps(runs))`
  const runs = JSON.parse(execFileSync('python3', ['-c', py, pdf], { maxBuffer: 1 << 26 }).toString()) as [number, string[]][][]
  const out = { M: new Map<string, Set<string>>(), F: new Map<string, Set<string>>() }
  const put = (side: 'M' | 'F', run: [number, string[]][]) => { for (const [w, names] of run) { const s = out[side].get(String(w)) ?? new Set(); names.forEach(n => s.add(n.replace(/[^a-z|A-Z]/g, ''))); out[side].set(String(w), s) } }
  put('M', runs[0])
  // the girls: inside a later run, the stretch from the first weight of 90+ after one under 90 (or the run's start)
  // to its end, when that end is 190+ — middle school (70 … 180) never reaches it; a youth run can lead into it
  const girls: [number, string[]][][] = []
  for (const r of runs.slice(1)) {
    const i = r.findIndex((x, k) => x[0] >= 90 && x[0] < 120 && (k === 0 || r[k - 1][0] < 90))
    if (i >= 0 && r[r.length - 1][0] >= 190) girls.push(r.slice(i))
  }
  if (girls.length) put('F', girls[girls.length - 1])
  return out
}

// wrestlers + aliases, by name key, per side
type W = { id: string; first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }
async function all<T>(q: (f: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break } return out
}
const byName: Record<'M' | 'F', Map<string, W[]>> = { M: new Map(), F: new Map() }
for (const g of ['M', 'F'] as const) {
  const ws = await all<W>(f => db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos').eq('gender', g).order('id').range(f, f + 999))
  const wById = new Map(ws.map(w => [w.id, w]))
  const add = (k: string, w: W) => { const l = byName[g].get(k) ?? []; if (!l.some(x => x.id === w.id)) l.push(w); byName[g].set(k, l) }
  for (const w of ws) add(nameKey(w.first_name, w.last_name), w)
  const al = await all<{ raw_name: string; wrestler_id: string }>(f => db.from('wrestler_name_aliases').select('raw_name, wrestler_id').order('wrestler_id').range(f, f + 999))
  for (const a of al) { const w = wById.get(a.wrestler_id); if (w) { const n = splitName(a.raw_name); add(nameKey(n.first_name, n.last_name), w) } }
}

const review: string[] = []
const totals = { years: 0, rows: 0, nj: 0, linked: 0, newProspects: 0 }
for (const year of years) {
  const csv = files.find(f => f.startsWith(String(year)) && f.endsWith('.csv') && !/Early/i.test(f))
  const pdf = files.find(f => f.startsWith(String(year)) && f.endsWith('.pdf') && /Brackets/i.test(f))
  if (!csv || !pdf) { console.log(year, 'missing', !csv ? 'CSV' : 'PDF'); continue }
  const brackets = bracketsFrom(parseBoutExport(readFileSync(`${DIR}/${csv}`, 'utf8')))
  const secs = pdfSections(`${DIR}/${pdf}`)
  for (const g of ['M', 'F'] as const) {
    const pre = g === 'F' ? 'girls' : 'boys'
    // the bracket for each of this side's PDF weights: the CSV bracket at that weight with most wrestlers on those pages
    const chosen: { w: string; b: Bracket }[] = []
    for (const [w, names] of secs[g]) {
      const cands = brackets.filter(b => b.weight === w).map(b => ({ b, hit: b.people.filter(p => names.has(`${last(p.name)}|${st(p.team) ?? ''}`)).length }))
      const best = cands.sort((x, y) => y.hit - x.hit)[0]
      if (best && best.hit >= Math.max(3, best.b.people.length * 0.5)) chosen.push({ w, b: best.b })
      else review.push(`${year} ${DIVISION[g]} ${w}: no CSV bracket matches the PDF's (best ${best?.hit ?? 0} of ${best?.b.people.length ?? 0})`)
    }
    if (!chosen.length) continue
    const { data: ev } = await db.from(`${pre}_hub_events`).select('id').eq('tournament_id', TOURN[g]).eq('season', year).maybeSingle()
    if (ev) {
      const { count } = await db.from(`${pre}_hub_placements`).select('id', { count: 'exact', head: true }).eq('event_id', ev.id)
      if (count) { console.log(year, g, `already loaded (${count} places) — skipped`); continue }
    }
    // freestyle when the brackets were scored that way (2024 girls: VSU / VPO / VFA)
    const style: 'folkstyle' | 'freestyle' = chosen.some(c => c.b.bouts.some(x => /\bV(SU|PO|FA|FO)\b/.test(`${x.winType} ${x.result}`))) ? 'freestyle' : 'folkstyle'
    const rows: { w: string; place: number; place_to: number | null; name: string; state: string | null }[] = []
    for (const { w, b } of chosen) {
      // 2024 girls: a 7th-place pool's "Finals" lands in the same bracket as the real final (two finals). The real
      // final is the one between the two semifinal winners; the other decides 7th / 8th.
      if (mergedBracket(b)) {
        const finals = b.bouts.filter(x => x.loser && x.round === 'Finals')
        const semiWinners = new Set(b.bouts.filter(x => x.loser && x.round === 'Semi-Finals').map(x => `${x.winner}|${x.winTeam}`))
        const real = finals.filter(f => semiWinners.has(`${f.winner}|${f.winTeam}`) && semiWinners.has(`${f.loser}|${f.loseTeam}`))
        if (finals.length === 2 && real.length === 1 && !b.bouts.some(x => x.loser && /^7th place/i.test(x.round))) {
          const pool = finals.find(f => f !== real[0])!
          b.bouts = b.bouts.map(x => (x === pool ? { ...x, round: '7th Place' } : x))
        } else { review.push(`${year} ${DIVISION[g]} ${w}: two draws joined in the export — not placed`); continue }
      }
      for (const p of placesFrom(b)) if (p.place <= 8) rows.push({ w, place: p.place, place_to: p.place_to, name: p.person.name, state: st(p.person.team) })
    }
    // who each placer is
    const plan = rows.map(r => {
      const n = splitName(r.name), k = nameKey(n.first_name, n.last_name)
      let wrestler: string | null = null
      if (r.state === 'NJ') {
        // the name as listed, else without a suffix (George Walton III), else a nickname form (Nick / Nicholas, Louie /
        // Louis — the hub's list) — still exactly one wrestler; an 8th grader can wrestle the high school bracket
        const fits = (w: W) => !w.is_oos && (w.graduation_year == null || (w.graduation_year >= year + 1 && w.graduation_year <= year + 5))
        const bare = n.last_name.replace(/,?\s+(jr|sr|ii|iii|iv|v)\.?$/i, '')
        const tries = [k, nameKey(n.first_name, bare), ...otherForms(n.first_name).flatMap(f => [nameKey(f, n.last_name), nameKey(f, bare)])]
        let ws: W[] = []
        for (const t of tries) { ws = (byName[g].get(t) ?? []).filter(fits); if (ws.length) break }
        if (ws.length === 1) wrestler = ws[0].id
        else review.push(`${year} ${DIVISION[g]} ${r.w} ${r.place}: ${r.name} (NJ) — ${ws.length ? `${ws.length} wrestlers with that name` : 'no NJ wrestler with that name and class'}`)
      }
      return { ...r, ...n, k, wrestler }
    })
    const nj = plan.filter(p => p.state === 'NJ').length, linked = plan.filter(p => p.wrestler).length
    console.log(year, g, style, `${chosen.length} brackets, ${rows.length} places, NJ ${nj}, linked ${linked}`)
    totals.years++; totals.rows += rows.length; totals.nj += nj; totals.linked += linked
    if (!APPLY) continue

    // the event
    let eventId = ev?.id as number | undefined
    if (!eventId) {
      const date = parseBoutExport(readFileSync(`${DIR}/${csv}`, 'utf8'))[0]?.date ?? ''
      const m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
      const { data, error } = await db.from(`${pre}_hub_events`).insert({ tournament_id: TOURN[g], season: year, start_date: m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null }).select('id').single()
      if (error) throw new Error(`${pre} event ${year}: ${error.message}`)
      eventId = data.id
    }
    // prospects: the one linked to the wrestler, else one with this name and state, else new
    const prospects = await all<{ id: number; first_name: string; last_name: string; state: string | null; wrestler_id: string | null }>(f => db.from(`${pre}_prospects`).select('id, first_name, last_name, state, wrestler_id').order('id').range(f, f + 999))
    const byW = new Map(prospects.filter(p => p.wrestler_id).map(p => [p.wrestler_id!, p.id]))
    const byKey = new Map<string, typeof prospects>()
    for (const p of prospects) { const k = `${nameKey(p.first_name, p.last_name)}|${p.state ?? ''}`; byKey.set(k, [...(byKey.get(k) ?? []), p]) }
    const ids: number[] = []
    for (const p of plan) {
      let id = p.wrestler ? byW.get(p.wrestler) : undefined
      if (!id) { const same = (byKey.get(`${p.k}|${p.state ?? ''}`) ?? []).filter(x => !x.wrestler_id || x.wrestler_id === p.wrestler); if (same.length === 1) id = same[0].id }
      if (id && p.wrestler) { const { error } = await db.from(`${pre}_prospects`).update({ wrestler_id: p.wrestler }).eq('id', id).is('wrestler_id', null); if (error) throw new Error(error.message) }
      if (!id) {
        const { data, error } = await db.from(`${pre}_prospects`).insert({ first_name: p.first_name, last_name: p.last_name, state: p.state, wrestler_id: p.wrestler }).select('id').single()
        if (error) throw new Error(`prospect ${p.name}: ${error.message}`)
        id = data.id; totals.newProspects++
        const k = `${p.k}|${p.state ?? ''}`; byKey.set(k, [...(byKey.get(k) ?? []), { id: id!, first_name: p.first_name, last_name: p.last_name, state: p.state, wrestler_id: p.wrestler }])
        if (p.wrestler) byW.set(p.wrestler, id!)
      }
      ids.push(id!)
    }
    const { error } = await db.from(`${pre}_hub_placements`).insert(plan.map((p, i) => ({ event_id: eventId, style, division: DIVISION[g], weight: p.w, place: p.place, place_to: p.place_to, name_listed: p.name, prospect_id: ids[i] })))
    if (error) throw new Error(`${pre} placements ${year}: ${error.message}`)
    const weights = [...new Set(plan.map(p => p.w))]
    await db.from(`${pre}_hub_events`).update({ uploaded_at: new Date().toISOString(), upload_files: [csv, pdf], upload_divisions: [{ division: DIVISION[g], style, weights: weights.length, places: plan.length, placed_through: 8 }] }).eq('id', eventId)
  }
}
console.log(APPLY ? 'saved' : 'dry run', totals)
const out = `docs/reviews/super32_history_review_${APPLY ? 'applied' : 'dryrun'}.txt`
writeFileSync(out, review.join('\n') + '\n')
console.log(`review list (${review.length}): ${out}`)
