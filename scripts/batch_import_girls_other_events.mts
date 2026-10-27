// Batch import of the girls 2025-26 "Other" events (jamborees, quads, tris,
// mini-jams) from the Track exports in "Whizzer Upload/2025-26 Girls Data",
// which were never loaded. Same parser and matchers as the girls jamboree
// importer (/admin/import-jamboree-girls).
//
//   node --env-file=.env.local scripts/batch_import_girls_other_events.mts <src_dir> <report.json>
//       dry run: parses, matches, classifies, writes the review report only
//   node --env-file=.env.local scripts/batch_import_girls_other_events.mts <src_dir> <report.json> --apply <inserted.json>
//       also writes every pairing with status 'import' and saves the inserted ids
//
// Rules:
//   - Each event becomes one pseudo-dual per school pairing (parser output).
//   - A pairing already in dual_meets_girls on that date is left alone and listed.
//   - Schools: exact/high matches only; anything else holds the pairing for review.
//   - Wrestlers: exact/high link; low and "same name at another school" go to
//     review; no match creates a new wrestler.
//   - Every pairing is stored as a jamboree (not in team W-L). Pairings whose
//     result both schools' official 2025-26 W-L (power_points) is short of are
//     flagged wlCandidate in the report for the standings reconciliation; that
//     alone is too thin to count a jamboree bout as a dual.
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseJamboreeGirlsText } from '../src/lib/parseJamboreeGirls.ts'
import { matchSchoolNames } from '../src/lib/matchSchools.ts'
import { matchWrestler, reloadAliases } from '../src/lib/matchWrestlers.ts'
import { boutResultToDb } from '../src/lib/parseRtf.ts'

const SEASON = 2026
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [srcDir, reportPath, applyFlag, insertedPath] = process.argv.slice(2)
if (!srcDir || !reportPath) throw new Error('usage: <src_dir> <report.json> [--apply <inserted.json>]')
const APPLY = applyFlag === '--apply'
if (APPLY && !insertedPath) throw new Error('--apply needs an output path for the inserted ids')

// Reviewed 2026-10-26.
// Track header typos the Nov–Mar rule can't settle.
const DATE_FIXES: Record<string, string> = {
  'franklin vs spotswood': '2026-02-20',   // "12/20/2026", filed between two 2/20 events
}
// Low-confidence wrestler matches: true = same girl (link), false = different girl (new).
const LOW_MATCH_DECISIONS: Record<string, boolean> = {
  'Eternitiey Brown Cooper': true,   // Eternity Brown-Cooper, Neptune
  'Miranda Varguez':         true,   // Miranda Varquez, Bayonne
  'Christianna Martinez':    true,   // stored truncated as "Christia Martinez"
  'Janelly Estrada':         false,  // Emely Estrada is a teammate (both at Spotswood Quad)
  'Flor Morales':            false,
  'Estephany Romero':        false,
  'Hayley Martinez':         false,
  'Janet Nieves':            false,
}
// Raw school names held out until a school record exists / is confirmed.
// (Mary Help of Christians Academy and William Penn Charter School were held on
// the first run and released after 20261026_restore_mary_help_kayla_coletta.)
const HOLD_SCHOOLS: Record<string, string> = {}
// One bout Track lists twice with different times, in two views of the same
// event: keep the listing with this detail.
const SAME_BOUT_KEEP: { winner: string; loser: string; date: string; keep: string }[] = [
  { winner: 'Marianna Zegel', loser: 'Kayla Coletta', date: '2026-02-09', keep: '1:28' },   // Par Hills Mini Jam IV, 1:25 / 1:28
]

async function all(q: () => any) {
  let out: any[] = []
  for (let i = 0; ; i += 1000) {
    const { data, error } = await q().range(i, i + 999)
    if (error) throw error
    out = out.concat(data)
    if (data.length < 1000) break
  }
  return out
}

// ── 1. Events ────────────────────────────────────────────────────────────────
const HEADER_RE = /^(\S.*?) - (\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/
const SKIP_EVENTS = [/queen of the mat/i]   // loaded as an in-season tournament

type Event = { name: string; iso: string; mmddyyyy: string; dateNote: string | null; text: string; files: string[] }
const events = new Map<string, Event>()
for (const f of readdirSync(srcDir).filter(f => /other/i.test(f))) {
  const lines = readFileSync(`${srcDir}/${f}`, 'utf8').split('\n')
  const heads: number[] = []
  lines.forEach((l, i) => { if (HEADER_RE.test(l.replace(/ /g, ' '))) heads.push(i) })
  for (let h = 0; h < heads.length; h++) {
    const m = lines[heads[h]].replace(/ /g, ' ').match(HEADER_RE)!
    const name = m[1].trim()
    if (SKIP_EVENTS.some(r => r.test(name))) continue
    const mm = Number(m[2]), dd = Number(m[3]), yy = Number(m[4])
    // Season runs Nov–Mar: Aug–Dec is 2025, Jan–Jul is 2026 (fixes "3026", "12/20/2026")
    const fixed = DATE_FIXES[name.toLowerCase()]
    const year = fixed ? Number(fixed.slice(0, 4)) : mm >= 8 ? 2025 : 2026
    const iso = fixed ?? `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    const key = `${name.toLowerCase()}|${iso}`
    const text = lines.slice(heads[h], heads[h + 1] ?? lines.length).join('\n')
    const ev = events.get(key)
    if (ev) { ev.text += '\n\n' + text; if (!ev.files.includes(f)) ev.files.push(f); continue }
    const [iy, im, id] = iso.split('-')
    events.set(key, {
      name, iso, mmddyyyy: `${im}/${id}/${iy}`,
      dateNote: fixed || year !== yy ? `source says ${m[2]}/${m[3]}/${m[4]}` : null, text, files: [f],
    })
  }
}

// ── 2. Existing data ─────────────────────────────────────────────────────────
const existingMeets = await all(() => db.from('dual_meets_girls').select('id,meet_date,team1_school_id,team2_school_id,team1_score,team2_score,meet_kind,counts_toward_record').eq('season_id', SEASON).order('id'))
const existingPair = new Map<string, any>()
for (const m of existingMeets) existingPair.set(`${m.meet_date}|${[m.team1_school_id, m.team2_school_id].sort((a, b) => a - b).join('-')}`, m)

const pp = await all(() => db.from('power_points').select('school_id,overall_wins,overall_losses,overall_ties,pp_group').eq('gender', 'F').eq('season_id', SEASON).order('school_id'))
const gap = new Map<number, { w: number; l: number; t: number }>()
for (const p of pp) gap.set(p.school_id, { w: p.overall_wins, l: p.overall_losses, t: p.overall_ties ?? 0 })
for (const m of existingMeets) {
  if (!m.counts_toward_record || m.meet_kind === 'jamboree') continue
  for (const [me, ms, os] of [[m.team1_school_id, m.team1_score, m.team2_score], [m.team2_school_id, m.team2_score, m.team1_score]]) {
    const g = gap.get(me); if (!g) continue
    if (ms > os) g.w--; else if (ms < os) g.l--; else g.t--
  }
}

const girls = await all(() => db.from('wrestlers').select('id,first_name,last_name').eq('gender', 'F').order('id'))
const girlsByName = new Map<string, string[]>()
for (const w of girls) { const k = `${w.first_name} ${w.last_name}`.toLowerCase(); girlsByName.set(k, [...(girlsByName.get(k) ?? []), w.id]) }

// ── 3. Parse + match ─────────────────────────────────────────────────────────
await reloadAliases()
const schoolCache = new Map<string, Awaited<ReturnType<typeof matchSchoolNames>>>()
async function school(raw: string) {
  if (!schoolCache.has(raw)) schoolCache.set(raw, await matchSchoolNames(raw, { gender: 'F', seasonId: SEASON }))
  return schoolCache.get(raw)!
}
const wrestlerCache = new Map<string, any>()
async function wrestler(name: string, schoolId: number, weight: number) {
  const k = `${name}|${schoolId}|${weight}`
  if (!wrestlerCache.has(k)) {
    const r = await matchWrestler(name, schoolId, weight, 'F')
    let status: string
    if (r.wrestlerId && (r.confidence === 'exact' || r.confidence === 'high')) status = 'link'
    else if (r.wrestlerId && name in LOW_MATCH_DECISIONS) status = LOW_MATCH_DECISIONS[name] ? 'link' : 'new'
    else if (r.wrestlerId) status = 'review_low'
    else if (girlsByName.has(name.toLowerCase())) status = 'review_same_name_elsewhere'
    else status = 'new'
    wrestlerCache.set(k, { name, schoolId, weight, status, wrestlerId: r.wrestlerId, matchedName: r.displayName, confidence: r.confidence,
      sameNameIds: status === 'review_same_name_elsewhere' ? girlsByName.get(name.toLowerCase()) : undefined })
  }
  return wrestlerCache.get(k)
}

const report: any = { generated: new Date().toISOString(), events: [] }
for (const ev of [...events.values()].sort((a, b) => a.iso.localeCompare(b.iso))) {
  const meets = parseJamboreeGirlsText(ev.text, ev.mmddyyyy)
  const out: any = { name: ev.name, date: ev.iso, dateNote: ev.dateNote, files: ev.files, pairings: [] }
  for (const m of meets) {
    const s1 = await school(m.team1Name), s2 = await school(m.team2Name)
    const ok = (s: any) => s.schoolId && (s.confidence === 'exact' || s.confidence === 'high' || (s.confidence === 'oos' && s.displayName === s.rawName))
    const p: any = {
      team1: { raw: m.team1Name, id: s1.schoolId, name: s1.displayName, conf: s1.confidence },
      team2: { raw: m.team2Name, id: s2.schoolId, name: s2.displayName, conf: s2.confidence },
      team1Score: m.team1Score, team2Score: m.team2Score, bouts: [], status: 'import', kind: 'jamboree',
    }
    const held = HOLD_SCHOOLS[m.team1Name] ?? HOLD_SCHOOLS[m.team2Name]
    if (held) { p.status = 'held'; p.heldReason = held }
    else if (!ok(s1) || !ok(s2)) p.status = 'review_school'
    else {
      const ex = existingPair.get(`${ev.iso}|${[s1.schoolId, s2.schoolId].sort((a, b) => a - b).join('-')}`)
      if (ex) { p.status = 'exists'; p.existing = { id: ex.id, kind: ex.meet_kind, score: `${ex.team1_score}-${ex.team2_score}` } }
    }
    for (const b of m.matches) {
      const dup = SAME_BOUT_KEEP.find(d => d.date === ev.iso && d.winner === b.winnerName && d.loser === b.loserName)
      if (dup && b.resultDetail !== dup.keep) {
        if (b.winnerSchoolRaw === m.team1Name) p.team1Score -= b.team1Points; else p.team2Score -= b.team2Points
        continue
      }
      const bout: any = { ...b }
      if (p.status !== 'review_school' && p.status !== 'held') {
        const ws = b.winnerSchoolRaw === m.team1Name ? s1.schoolId : s2.schoolId
        const ls = b.loserSchoolRaw === m.team1Name ? s1.schoolId : s2.schoolId
        if (b.winnerName) bout.winner = await wrestler(b.winnerName, ws, b.weightClass)
        if (b.loserName && !b.isForfeitWin) bout.loser = await wrestler(b.loserName, ls, b.weightClass)
      }
      p.bouts.push(bout)
    }
    out.pairings.push(p)
  }
  report.events.push(out)
}

// ── 3b. Same two schools on the same date in two listings = one meeting ──────
// (e.g. Butler / Summit 1/12 appears in two event exports). Bouts are combined;
// a bout listed in both is kept once.
{
  const byKey = new Map<string, any>()
  for (const e of report.events) for (const p of e.pairings) {
    if (p.status !== 'import') continue
    const k = `${e.date}|${[p.team1.id, p.team2.id].sort((a: number, b: number) => a - b).join('-')}`
    const first = byKey.get(k)
    if (!first) { byKey.set(k, p); continue }
    const flip = first.team1.id !== p.team1.id
    const sig = (b: any) => `${b.winnerName}|${b.loserName}|${b.resultType}|${b.resultDetail}`.toLowerCase()
    const have = new Set(first.bouts.map(sig))
    for (const b of p.bouts) {
      if (have.has(sig(b))) continue
      first.bouts.push(flip ? { ...b, team1Points: b.team2Points, team2Points: b.team1Points } : b)
      first.team1Score += flip ? b.team2Points : b.team1Points
      first.team2Score += flip ? b.team1Points : b.team2Points
    }
    first.mergedFrom = [...(first.mergedFrom ?? []), e.name]
    p.status = 'merged'; p.mergedInto = k
  }
}

// ── 4. Classify against official W-L (largest pairings first) ─────────────────
const candidates = report.events.flatMap((e: any) => e.pairings.filter((p: any) => p.status === 'import').map((p: any) => ({ e, p })))
candidates.sort((a: any, b: any) => b.p.bouts.length - a.p.bouts.length)
for (const { p } of candidates) {
  const g1 = gap.get(p.team1.id), g2 = gap.get(p.team2.id)
  if (!g1 || !g2) continue
  const [r1, r2] = p.team1Score > p.team2Score ? ['w', 'l'] : p.team1Score < p.team2Score ? ['l', 'w'] : ['t', 't']
  if ((g1 as any)[r1] > 0 && (g2 as any)[r2] > 0) {
    (g1 as any)[r1]--; (g2 as any)[r2]--
    p.wlCandidate = true
  } else {
    const [o1, o2] = r1 === 'w' ? ['l', 'w'] : r1 === 'l' ? ['w', 'l'] : [null, null]
    if (o1 && (g1 as any)[o1] > 0 && (g2 as any)[o2!] > 0) p.officialSuggestsOtherWinner = true
  }
}

// ── 5. Summary ───────────────────────────────────────────────────────────────
const ps = report.events.flatMap((e: any) => e.pairings)
const ws = [...wrestlerCache.values()]
report.summary = {
  events: report.events.length,
  pairings: ps.length,
  byStatus: ps.reduce((a: any, p: any) => (a[p.status] = (a[p.status] ?? 0) + 1, a), {}),
  boutsToImport: ps.filter((p: any) => p.status === 'import').reduce((n: number, p: any) => n + p.bouts.length, 0),
  wlCandidates: ps.filter((p: any) => p.wlCandidate).length,
  otherWinnerFlags: ps.filter((p: any) => p.officialSuggestsOtherWinner).length,
  wrestlers: ws.reduce((a: any, w: any) => (a[w.status] = (a[w.status] ?? 0) + 1, a), {}),
  unmatchedSchools: [...schoolCache.values()].filter(s => !(s.schoolId && (s.confidence === 'exact' || s.confidence === 'high' || (s.confidence === 'oos' && s.displayName === s.rawName)))).map(s => ({ raw: s.rawName, conf: s.confidence, best: s.displayName })),
}
writeFileSync(reportPath, JSON.stringify(report, null, 1))
console.log(JSON.stringify(report.summary, null, 1))

if (APPLY) await applyImport()

// ── 6. Apply ─────────────────────────────────────────────────────────────────
// Same row shapes as src/app/api/admin/import-meets-girls/route.ts (jamboree mode).
async function applyImport() {
  const pending = ps.filter((p: any) => p.status === 'import')
  const blocking = ws.filter((w: any) => w.status.startsWith('review')) as any[]
  const inPending = new Set(pending.flatMap((p: any) => p.bouts.flatMap((b: any) => [b.winner, b.loser])))
  if (blocking.some(w => inPending.has(w))) throw new Error('unreviewed wrestler matches remain — add them to LOW_MATCH_DECISIONS')

  const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
  const inserted: any = { wrestlers: [], meets: [], aliases: [] }
  const save = () => writeFileSync(insertedPath, JSON.stringify(inserted, null, 1))

  // New wrestlers: one per name + school across the whole batch
  const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])
  const parseName = (raw: string) => {
    const parts = raw.trim().split(/\s+/)
    if (parts.length <= 1) return { first_name: raw.trim(), last_name: '', suffix: null as string | null }
    let suffix: string | null = null, lastIdx = parts.length - 1
    if (SUFFIXES.has(parts[lastIdx].toLowerCase().replace(/\.$/, ''))) { suffix = parts[lastIdx]; lastIdx--; if (lastIdx === 0) return { first_name: parts[0], last_name: '', suffix } }
    return { first_name: parts.slice(0, lastIdx).join(' '), last_name: parts[lastIdx], suffix }
  }
  const oos = new Set([...schoolCache.values()].filter(s => s.confidence === 'oos').map(s => s.schoolId))
  const newIds = new Map<string, string>()
  for (const w of ws.filter((w: any) => w.status === 'new' && inPending.has(w))) {
    const k = `${w.name.toLowerCase()}|${w.schoolId}`
    if (newIds.has(k)) continue
    const row = ok(await db.from('wrestlers').insert({ ...parseName(w.name), gender: 'F', is_stub: oos.has(w.schoolId) }).select('id').single()) as any
    newIds.set(k, row.id); inserted.wrestlers.push(row.id)
    save()
  }
  save()
  const idOf = (w: any) => w ? (w.status === 'new' ? newIds.get(`${w.name.toLowerCase()}|${w.schoolId}`)! : w.wrestlerId) : null

  const aliasMap = new Map<string, any>()
  for (const p of pending) {
    const ev = report.events.find((e: any) => e.pairings.includes(p))
    const meet = ok(await db.from('dual_meets_girls').insert({
      season_id: SEASON, team1_school_id: p.team1.id, team2_school_id: p.team2.id,
      team1_school_name_raw: p.team1.raw, team2_school_name_raw: p.team2.raw, meet_date: ev.date,
      team1_score: p.team1Score, team2_score: p.team2Score, status: 'final',
      meet_kind: 'jamboree', counts_toward_record: false,
    }).select('id').single()) as any
    inserted.meets.push(meet.id)
    save()
    const rows = p.bouts.map((b: any, i: number) => {
      const winnerId = b.isDoubleForfeit ? null : idOf(b.winner)
      const loserId = b.isDoubleForfeit || b.isForfeitWin ? null : idOf(b.loser)
      const winnerIsT1 = b.winnerSchoolRaw === p.team1.raw
      for (const [w, id] of [[b.winner, winnerId], [b.loser, loserId]]) if (w && id) aliasMap.set(`${w.name}|${w.schoolId}`, { raw_name: w.name, school_id: w.schoolId, wrestler_id: id })
      const r = boutResultToDb(b.resultType, b.resultDetail)
      const [aId, bId, aRaw, bRaw] = b.isDoubleForfeit ? [null, null, null, null]
        : winnerIsT1 ? [winnerId, loserId, b.winnerName, b.isForfeitWin ? null : b.loserName]
        : [loserId, winnerId, b.isForfeitWin ? null : b.loserName, b.winnerName]
      return {
        dual_meet_id: meet.id, weight_class: b.weightClass, order_index: i,
        wrestler_a_id: aId, wrestler_b_id: bId, wrestler_a_name_raw: aRaw, wrestler_b_name_raw: bRaw,
        school_a_id: p.team1.id, school_b_id: p.team2.id, winner_id: winnerId,
        result_type: r.db_type ?? b.resultType, result_detail: r.db_detail,
        fall_time_seconds: r.fall_time_seconds, result_time_estimated: r.result_time_estimated,
        winner_score: r.winner_score, loser_score: r.loser_score,
        team1_points: b.team1Points, team2_points: b.team2Points,
        is_double_forfeit: b.isDoubleForfeit, is_forfeit_win: b.isForfeitWin, validated: false,
      }
    })
    ok(await db.from('dual_meet_matches_girls').insert(rows))
    if (inserted.meets.length % 100 === 0) console.log('meets', inserted.meets.length)
  }
  save()

  // Aliases: only new (raw_name, school_id) pairs — never repoint an existing one
  const existing = await all(() => db.from('wrestler_name_aliases').select('raw_name,school_id').order('id'))
  const have = new Set(existing.map((a: any) => `${a.raw_name}|${a.school_id}`))
  const fresh = [...aliasMap.entries()].filter(([k]) => !have.has(k)).map(([, v]) => v)
  for (let i = 0; i < fresh.length; i += 500) {
    const rows = ok(await db.from('wrestler_name_aliases').insert(fresh.slice(i, i + 500)).select('id')) as any[]
    inserted.aliases.push(...rows.map(r => r.id))
  }
  save()
  console.log('applied:', { wrestlers: inserted.wrestlers.length, meets: inserted.meets.length, aliases: inserted.aliases.length })
}
