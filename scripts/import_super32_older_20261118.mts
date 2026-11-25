// Kyle 2026-11-18: Super 32 Challenge before 2016 — the high school boys podiums of each year into the Offseason Hub,
// with each New Jersey placer linked to our wrestler when certain (the same rules as
// scripts/import_super32_history_20261118.mts: exactly one wrestler of the name — as listed, without a suffix, or a
// nickname form — with a class that fits the October it was held, season + 1 … + 5 or unknown; otherwise listed for
// review; no match = he didn't wrestle NJSIAA). Super 32 had no girls division then.
// Reads place files (TSV: year, weight, place, place_to, name, school, state) made from the result files:
//   scripts/transcribe/super32_rtf.py   2000–2004 (places 1–4)
//   scripts/transcribe/super32_lists.py 2009–2012 (places 1–8)
//   scripts/transcribe/super32_brackets.py 2005–2008 (the Brute bracket PDFs; 2006 prints no states — see below), 2013 138–220
//   scripts/transcribe/super32_2013.py    2013 106–132 and 285 (one-page day-2 brackets)
// Season = the year held. A year whose hub event already has placements is skipped. Dry run unless --apply.
//   npx tsx scripts/import_super32_older_20261118.mts <file.tsv> [more.tsv …] [--apply]
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { splitName, nameKey } from '../src/lib/hub'
import { otherForms } from '../src/lib/nicknames'

const APPLY = process.argv.includes('--apply')
const inputs = process.argv.slice(2).filter(a => !a.startsWith('--'))
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const TOURN = 18, DIVISION = 'High School Boys'

type Row = { year: number; w: string; place: number; place_to: number | null; name: string; school: string; state: string | null }
const rows: Row[] = inputs.flatMap(f => readFileSync(f, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => {
  const [year, w, place, place_to, name, school, state] = l.split('\t')
  return { year: Number(year), w, place: Number(place), place_to: place_to ? Number(place_to) : null, name: name.trim(), school: school?.trim() ?? '', state: state?.trim() || null }
}))

type W = { id: string; first_name: string; last_name: string; graduation_year: number | null; is_oos: boolean }
async function all<T>(q: (f: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); const d = (data ?? []) as T[]; out.push(...d); if (d.length < 1000) break } return out
}
const byName = new Map<string, W[]>()
const ws = await all<W>(f => db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos').eq('gender', 'M').order('id').range(f, f + 999))
const wById = new Map(ws.map(w => [w.id, w]))
const add = (k: string, w: W) => { const l = byName.get(k) ?? []; if (!l.some(x => x.id === w.id)) l.push(w); byName.set(k, l) }
for (const w of ws) add(nameKey(w.first_name, w.last_name), w)
for (const a of await all<{ raw_name: string; wrestler_id: string }>(f => db.from('wrestler_name_aliases').select('raw_name, wrestler_id').order('wrestler_id').range(f, f + 999))) {
  const w = wById.get(a.wrestler_id); if (w) { const n = splitName(a.raw_name); add(nameKey(n.first_name, n.last_name), w) }
}

// two of our wrestlers share the name: the one meant, from his weights and years (checked 2026-11-18)
const PICK: Record<string, string> = {
  '2012|106|Nick Suriano': '3a982bf7-cf90-44c4-b017-eda84e9df306',    // Bergen Catholic 106–126 (not the Southern Regional 195)
  '2015|106|Jojo Aragona': 'fc78c9ac-6be3-43cd-94c0-f3aa1f871ae2',    // Joseph Aragona, Pope John XXIII (106–138) — "Jojo" on the bracket
  '2013|113|Nick Suriano': '3a982bf7-cf90-44c4-b017-eda84e9df306',    // the same Bergen Catholic Suriano
  '2012|152|Wayne Stinson': 'b25673fa-8573-471c-a88e-69b703c44fa1',   // Northern Burlington, 2010 region champ (not the 1979 state 2nd)
}
// a common name whose only fit is doubtful: left unlinked and on the review list
const NO_LINK: Record<string, string> = { '2012|195|Matthew Moore': 'common name; the only NJ fit is a WW-P North 285 — check before linking' }
// 2006's brackets print no state: a placer there is linked (and taken as NJ) only when one NJ wrestler fits the name and
// class AND wrestled for a school of the name printed (as our entries, district/region/state lists or history list it)
const norm = (x: string) => x.toLowerCase().replace(/\bst\.?\s/g, 'st ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
async function schoolsOf(id: string) {
  const out = new Set<string>()
  const te = await db.from('tournament_entries').select('school_context_raw, school_id').eq('wrestler_id', id)
  for (const e of te.data ?? []) { if (e.school_context_raw) out.add(norm(e.school_context_raw)) }
  const ids = [...new Set((te.data ?? []).map(e => e.school_id).filter(Boolean))]
  if (ids.length) for (const sc of (await db.from('schools').select('name').in('id', ids)).data ?? []) out.add(norm(sc.name))
  for (const e of (await db.from('playoff_history_entrants').select('team').eq('wrestler_id', id)).data ?? []) if (e.team) out.add(norm(e.team))
  for (const e of (await db.from('history_finishes').select('school').eq('wrestler_id', id)).data ?? []) if (e.school) out.add(norm(e.school))
  return out
}
const review: string[] = [], links: string[] = []
// two NJ wrestlers of the name: the one who wrestled for the school printed, when exactly one did
for (const r of rows.filter(r => r.state === 'NJ' && r.school && !PICK[`${r.year}|${r.w}|${r.name}`])) {
  const n = splitName(r.name), bare = n.last_name.replace(/,?\s+(jr|sr|ii|iii|iv|v)\.?$/i, '')
  const fits = (w: W) => !w.is_oos && (w.graduation_year == null || (w.graduation_year >= r.year + 1 && w.graduation_year <= r.year + 5))
  const cand = [...new Map([nameKey(n.first_name, n.last_name), nameKey(n.first_name, bare)].flatMap(k => (byName.get(k) ?? []).filter(fits)).map(w => [w.id, w])).values()]
  if (cand.length < 2) continue
  const same: W[] = []
  for (const w of cand) { const sc = await schoolsOf(w.id); const want = norm(r.school); if ([...sc].some(x => x === want || x.startsWith(want + ' ') || want.startsWith(x + ' '))) same.push(w) }
  if (same.length === 1) PICK[`${r.year}|${r.w}|${r.name}`] = same[0].id
}
for (const r of rows.filter(r => !r.state && r.school)) {
  const n = splitName(r.name), bare = n.last_name.replace(/,?\s+(jr|sr|ii|iii|iv|v)\.?$/i, '')
  const fits = (w: W) => !w.is_oos && (w.graduation_year == null || (w.graduation_year >= r.year + 1 && w.graduation_year <= r.year + 5))
  const cand = [...new Map([nameKey(n.first_name, n.last_name), nameKey(n.first_name, bare), ...otherForms(n.first_name).map(f => nameKey(f, bare))]
    .flatMap(k => (byName.get(k) ?? []).filter(fits)).map(w => [w.id, w])).values()]
  const same: W[] = []
  for (const w of cand) { const sc = await schoolsOf(w.id); const want = norm(r.school); if ([...sc].some(x => x === want || x.startsWith(want + ' ') || want.startsWith(x + ' '))) same.push(w) }
  if (same.length === 1) { r.state = 'NJ'; PICK[`${r.year}|${r.w}|${r.name}`] = same[0].id }
  else if (cand.length) review.push(`${r.year} ${r.w} ${r.place}: ${r.name} (${r.school}, no state printed) — ${cand.length} NJ wrestler(s) of that name, ${same.length} at that school: not linked`)
}
const totals = { years: 0, rows: 0, nj: 0, linked: 0, newProspects: 0 }
for (const year of [...new Set(rows.map(r => r.year))].sort()) {
  const mine = rows.filter(r => r.year === year)
  const { data: ev } = await db.from('boys_hub_events').select('id').eq('tournament_id', TOURN).eq('season', year).maybeSingle()
  if (ev) { const { count } = await db.from('boys_hub_placements').select('id', { count: 'exact', head: true }).eq('event_id', ev.id); if (count) { console.log(year, `already loaded (${count}) — skipped`); continue } }
  const plan = mine.map(r => {
    // "Alexander (Lenny) Richardson": the nickname in brackets is tried as a first name too
    const nick = r.name.match(/\(([^)]+)\)/)?.[1]
    const n = splitName(r.name.replace(/\s*\([^)]*\)\s*/, ' ').trim()), k = nameKey(n.first_name, n.last_name)
    let wrestler: string | null = null
    if (NO_LINK[`${year}|${r.w}|${r.name}`]) review.push(`${year} ${r.w} ${r.place}: ${r.name} (${r.school || r.state}) — ${NO_LINK[`${year}|${r.w}|${r.name}`]}`)
    else if (PICK[`${year}|${r.w}|${r.name}`]) wrestler = PICK[`${year}|${r.w}|${r.name}`]
    else if (r.state === 'NJ') {
      const fits = (w: W) => !w.is_oos && (w.graduation_year == null || (w.graduation_year >= year + 1 && w.graduation_year <= year + 5))
      const bare = n.last_name.replace(/,?\s+(jr|sr|ii|iii|iv|v)\.?$/i, '')
      const tries = [k, nameKey(n.first_name, bare), ...[n.first_name, ...(nick ? [nick] : [])].flatMap(fn => otherForms(fn).concat(fn === n.first_name ? [] : [fn])).flatMap(f => [nameKey(f, n.last_name), nameKey(f, bare)])]
      let hit: W[] = []
      for (const t of tries) { hit = (byName.get(t) ?? []).filter(fits); if (hit.length) break }
      if (hit.length === 1) wrestler = hit[0].id
      else if (hit.length) review.push(`${year} ${r.w} ${r.place}: ${r.name} (${r.school || 'NJ'}) — ${hit.length} wrestlers with that name`)
      else review.push(`${year} ${r.w} ${r.place}: ${r.name} (${r.school || 'NJ'}) — no NJ wrestler with that name and class (didn't wrestle NJSIAA, or not in our records)`)
    }
    if (wrestler && process.argv.includes('--show')) links.push(`${year} ${r.w} ${r.place} ${r.name} (${r.school || r.state}) → ${wrestler}`)
    return { ...r, ...n, k, wrestler }
  })
  const nj = plan.filter(p => p.state === 'NJ').length, linked = plan.filter(p => p.wrestler).length
  console.log(year, `${new Set(plan.map(p => p.w)).size} weights, ${plan.length} places, NJ ${nj}, linked ${linked}`)
  totals.years++; totals.rows += plan.length; totals.nj += nj; totals.linked += linked
  if (!APPLY) continue

  let eventId = ev?.id as number | undefined
  if (!eventId) {
    const { data, error } = await db.from('boys_hub_events').insert({ tournament_id: TOURN, season: year }).select('id').single()
    if (error) throw new Error(`event ${year}: ${error.message}`)
    eventId = data.id
  }
  const prospects = await all<{ id: number; first_name: string; last_name: string; state: string | null; wrestler_id: string | null }>(f => db.from('boys_prospects').select('id, first_name, last_name, state, wrestler_id').order('id').range(f, f + 999))
  const byW = new Map(prospects.filter(p => p.wrestler_id).map(p => [p.wrestler_id!, p.id]))
  const byKey = new Map<string, typeof prospects>()
  for (const p of prospects) { const k = `${nameKey(p.first_name, p.last_name)}|${p.state ?? ''}`; byKey.set(k, [...(byKey.get(k) ?? []), p]) }
  const ids: number[] = []
  for (const p of plan) {
    let id = p.wrestler ? byW.get(p.wrestler) : undefined
    if (!id) { const same = (byKey.get(`${p.k}|${p.state ?? ''}`) ?? []).filter(x => !x.wrestler_id || x.wrestler_id === p.wrestler); if (same.length === 1) id = same[0].id }
    if (id && p.wrestler) { const { error } = await db.from('boys_prospects').update({ wrestler_id: p.wrestler }).eq('id', id).is('wrestler_id', null); if (error) throw new Error(error.message) }
    if (!id) {
      const { data, error } = await db.from('boys_prospects').insert({ first_name: p.first_name, last_name: p.last_name, state: p.state, wrestler_id: p.wrestler }).select('id').single()
      if (error) throw new Error(`prospect ${p.name}: ${error.message}`)
      id = data.id; totals.newProspects++
      const k = `${p.k}|${p.state ?? ''}`; byKey.set(k, [...(byKey.get(k) ?? []), { id: id!, first_name: p.first_name, last_name: p.last_name, state: p.state, wrestler_id: p.wrestler }])
      if (p.wrestler) byW.set(p.wrestler, id!)
    }
    ids.push(id!)
  }
  const { error } = await db.from('boys_hub_placements').insert(plan.map((p, i) => ({ event_id: eventId, style: 'folkstyle', division: DIVISION, weight: p.w, place: p.place, place_to: p.place_to, name_listed: p.name, club_listed: p.school || null, prospect_id: ids[i] })))
  if (error) throw new Error(`placements ${year}: ${error.message}`)
  await db.from('boys_hub_events').update({ uploaded_at: new Date().toISOString(), upload_files: inputs.map(f => f.split('/').pop()!), upload_divisions: [{ division: DIVISION, style: 'folkstyle', weights: new Set(plan.map(p => p.w)).size, places: plan.length, placed_through: Math.max(...plan.map(p => p.place_to ?? p.place)) }] }).eq('id', eventId)
}
if (links.length) console.log(links.join('\n'))
console.log(APPLY ? 'saved' : 'dry run', totals)
const out = `docs/reviews/super32_older_review_${APPLY ? 'applied' : 'dryrun'}.txt`
writeFileSync(out, review.join('\n') + '\n')
console.log(`review list (${review.length}): ${out}`)
