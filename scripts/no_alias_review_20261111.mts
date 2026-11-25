// Review list for the integrity rule "records at a school where the wrestler has no alias (but has one
// elsewhere)" (pinned by Kyle 2026-11-06, worked case by case). One row per wrestler + stray school, with
// where they wrestled, a guess (transfer / wrong match / results-file mix-up), a confidence and the reason.
// Read-only. Writes docs/reviews/no_alias_review.csv.
//   npx tsx --tsconfig tsconfig.json scripts/no_alias_review_20261111.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, cols: string) {
  const out: any[] = []; let last: any = null
  for (;;) { let q = db.from(t).select(cols).order('id').limit(1000); if (last != null) q = q.gt('id', last); const { data, error } = await q; if (error) throw new Error(`${t}: ${error.message}`); out.push(...data!); if (data!.length < 1000) break; last = (data as any)[data!.length - 1].id }
  return out
}
const schools = new Map((await all('schools', 'id, display_name, is_nj')).map(s => [s.id, s]))
const sn = (id: number) => schools.get(id)?.display_name ?? `#${id}`
const W = new Map((await all('wrestlers', 'id, first_name, last_name, gender, graduation_year, is_oos')).map(w => [w.id, w]))
const seasonLabel = (end: number) => `${end - 1}-${String(end).slice(2)}`

type Rec = { school: number; season: number; date: string; event: string; weight: number | null }
const recs = new Map<string, Rec[]>()
const add = (w: string | null, s: number | null, r: Omit<Rec, 'school'>) => { if (w && s != null) (recs.get(w) ?? recs.set(w, []).get(w)!).push({ school: s, ...r }) }
for (const g of ['M', 'F']) {
  const meets = new Map((await all(g === 'F' ? 'dual_meets_girls' : 'dual_meets', 'id, meet_date, season_id, team1_school_id, team2_school_id')).map(m => [m.id, m]))
  for (const b of await all(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id')) {
    const m = meets.get(b.dual_meet_id); if (!m) continue
    const ev = `dual ${sn(m.team1_school_id)} v ${sn(m.team2_school_id)}`
    add(b.wrestler_a_id, b.school_a_id, { season: m.season_id, date: m.meet_date, event: ev, weight: b.weight_class })
    add(b.wrestler_b_id, b.school_b_id, { season: m.season_id, date: m.meet_date, event: ev, weight: b.weight_class })
  }
  const ist = new Map((await all(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id, name, start_date, season')).map(t => [t.id, t]))
  for (const b of await all(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, weight_class, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')) {
    const t = ist.get(b.in_season_tournament_id); if (!t) continue
    const se = Number(t.season.slice(0, 4)) + 1
    add(b.wrestler1_id, b.wrestler1_school_id, { season: se, date: t.start_date, event: t.name, weight: b.weight_class })
    add(b.wrestler2_id, b.wrestler2_school_id, { season: se, date: t.start_date, event: t.name, weight: b.weight_class })
  }
}
const wc = new Map((await all('weight_classes', 'id, weight')).map(x => [x.id, x.weight]))
const pt = new Map((await all('tournaments', 'id, season_id, name, start_date')).map(t => [t.id, t]))
for (const e of await all('tournament_entries', 'id, wrestler_id, school_id, tournament_id, weight_class_id')) {
  const t = pt.get(e.tournament_id); if (!t) continue
  add(e.wrestler_id, e.school_id, { season: t.season_id, date: t.start_date ?? '', event: `${seasonLabel(t.season_id)} ${t.name.replace(/_/g, "'").trim()}`, weight: wc.get(e.weight_class_id) ?? null })
}
const aliasAt = new Map<string, Map<number, string[]>>()
for (const a of await all('wrestler_name_aliases', 'id, wrestler_id, school_id, raw_name')) if (a.school_id != null) {
  const m = aliasAt.get(a.wrestler_id) ?? aliasAt.set(a.wrestler_id, new Map()).get(a.wrestler_id)!
  ;(m.get(a.school_id) ?? m.set(a.school_id, []).get(a.school_id)!).push(a.raw_name)
}
// other profiles by name (a namesake at the stray school = the bouts likely belong to them)
const byName = new Map<string, string[]>()
for (const w of W.values()) { const k = `${w.gender}|${w.first_name} ${w.last_name}`.toLowerCase(); (byName.get(k) ?? byName.set(k, []).get(k)!).push(w.id) }
const norm = (n: string) => n.toLowerCase().replace(/\(.*?\)/g, '').replace(/,\s*[a-z]{2}$/, '').replace(/\b(high school|hs|school|regional|reg|prep|academy)\b/g, '').replace(/[^a-z0-9]/g, '')

// programs that closed into another (Kyle 2026-11-10: Jackson Liberty folded into Jackson Township)
const FOLDED: [string, string][] = [['Jackson Liberty', 'Jackson Township']]
// already settled by Kyle (docs/reviews/track_page_review.md §3): pre-filled in your_call
const DECIDED: Record<string, string> = {
  'Finley Pazinko': 'same (Kyle 2026-11-10)', 'Jake Valeri': 'same (Kyle 2026-11-10)', 'Aidan Thompson': 'same (Kyle 2026-11-10)',
}
// a school's name for a season when it differs ("Jefferson-Sparta" girls 2025-26): co-ops formed that season
const seasonNames = new Map<string, string>()
for (const r of (await db.from('school_season_names').select('school_id, season_id, gender, display_name')).data ?? []) seasonNames.set(`${r.school_id}|${r.season_id}|${r.gender}`, r.display_name)
const coopNames = (schoolId: number, gender: string, seasons: Iterable<number>) =>
  [sn(schoolId), ...[...seasons].map(se => seasonNames.get(`${schoolId}|${se}|${gender}`)).filter(Boolean) as string[]]
const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
const summary = (rs: Rec[]) => {
  const seasons = [...new Set(rs.map(r => r.season))].sort().map(seasonLabel).join(', ')
  const weights = [...new Set(rs.map(r => r.weight).filter(Boolean))].sort((a, b) => a! - b!).join('/')
  const events = [...new Map(rs.map(r => [`${r.date}|${r.event}`, `${r.date ? r.date + ' ' : ''}${r.event}`])).values()].sort()
  return { seasons, weights, events }
}
const rows: string[] = ['gender,wrestler,grad_year,linked_school,linked_seasons,linked_weights,linked_events,stray_school,stray_records,stray_seasons,stray_weights,stray_events,guess,confidence,reason,your_call,wrestler_id,stray_school_id']
let n = 0
for (const [w, rs] of recs) {
  const al = aliasAt.get(w); if (!al?.size) continue
  const strays = [...new Set(rs.map(r => r.school))].filter(s => !al.has(s))
  if (!strays.length) continue
  const ww = W.get(w)!
  const linked = rs.filter(r => al.has(r.school))
  const L = summary(linked)
  for (const s of strays) {
    n++
    const st = rs.filter(r => r.school === s), S = summary(st)
    const linkedSchools = [...al.keys()]
    const linkedSeasons = new Set(linked.map(r => r.season)), straySeasons = new Set(st.map(r => r.season))
    const overlap = [...straySeasons].some(x => linkedSeasons.has(x))
    const lw = linked.map(r => r.weight).filter(Boolean) as number[], sw = st.map(r => r.weight).filter(Boolean) as number[]
    const near = lw.length && sw.length ? Math.min(...sw.map(a => Math.min(...lw.map(b => Math.abs(a - b))))) : null
    const sameDay = st.filter(r => r.date && linked.some(l => l.date === r.date))   // postseason events carry no date
    const nameAlike = linkedSchools.some(ls => { const a = norm(sn(ls)), b = norm(sn(s)); return a.length > 2 && b.length > 2 && (a.includes(b) || b.includes(a)) })
    const namesakes = (byName.get(`${ww.gender}|${ww.first_name} ${ww.last_name}`.toLowerCase()) ?? []).filter(x => x !== w && (aliasAt.get(x)?.has(s) || recs.get(x)?.some(r => r.school === s)))
    let guess: string, conf: string, why: string
    // the stray school is a member of the linked school's co-op name ("Lodi/Saddle Brook", "Cherry Hill East-West")
    const parts = (n: string) => { const ps = n.split(/\s*[/-]\s*/); return [...ps, ...ps.slice(1).map(p => `${ps[0].split(' ').slice(0, -1).join(' ')} ${p}`)].map(norm) }
    const coop = linkedSchools.some(ls => coopNames(ls, ww.gender, linkedSeasons).some(n => /[/-]/.test(n) && parts(n).includes(norm(sn(s)))))
    const folded = FOLDED.some(([a, b]) => sn(s) === a && linkedSchools.some(ls => sn(ls) === b))
    if (!linked.length) { guess = 'name link on the wrong school'; conf = 'high'; why = `every record is at ${sn(s)}; the name link was saved at ${linkedSchools.map(sn).join('/')}, which has none` }
    else if (namesakes.length) { guess = 'wrong match'; conf = 'high'; why = `another profile with this name wrestles for ${sn(s)}` }
    else if (coop && !overlap) { guess = 'program change'; conf = 'high'; why = `${sn(s)} before the co-op (${linkedSchools.map(ls => coopNames(ls, ww.gender, linkedSeasons).at(-1)).join('/')})` }
    else if (folded && !overlap) { guess = 'transfer'; conf = 'high'; why = `${sn(s)} folded into ${linkedSchools.map(sn).join('/')} (Kyle)` }
    else if (overlap && near != null && near >= 50) { guess = 'wrong match'; conf = 'high'; why = `same season at both schools, ${near} lbs apart` }
    else if (nameAlike) { guess = 'results-file mix-up'; conf = 'high'; why = `${sn(s)} and ${linkedSchools.map(sn).join('/')} are look-alike names` }
    else if (sameDay.length && near != null && near > 14) { guess = 'wrong match'; conf = 'high'; why = `same day at both schools, ${near}+ lbs apart` }
    else if (sameDay.length) { guess = 'results-file mix-up'; conf = 'medium'; why = `same day (${sameDay[0].date}) at both schools: school on the bout likely wrong` }
    else if (!overlap && near != null && near <= 20) { guess = 'transfer'; conf = near <= 12 ? 'high' : 'medium'; why = `different seasons, weights ${near} lbs apart` }
    else if (overlap && near != null && near <= 12) {
      const lastL = linked.filter(r => straySeasons.has(r.season) && r.date).map(r => r.date).sort(), lastS = st.filter(r => r.date).map(r => r.date).sort()
      const split = !!lastS.length && !!lastL.length && (lastS.at(-1)! < lastL[0] || lastS[0] > lastL.at(-1)!)
      guess = split ? 'transfer (mid-season)' : 'wrong match'; conf = split ? 'medium' : 'low'
      why = split ? 'same season, but all stray records come before or after the linked ones' : 'same season at both schools, dates interleave'
    } else if (overlap) { guess = 'wrong match'; conf = 'medium'; why = `same season at both schools, ${near ?? '?'} lbs apart` }
    else { guess = 'transfer'; conf = 'low'; why = `different seasons; weights ${near ?? 'unknown'} apart` }
    if (schools.get(s)?.is_nj === false && guess !== 'wrong match') why += `; ${sn(s)} is out of state`
    rows.push([ww.gender, `${ww.first_name} ${ww.last_name}`, ww.graduation_year, linkedSchools.map(sn).join(' / '), L.seasons, L.weights, L.events.slice(-4).join(' | '),
      sn(s), st.length, S.seasons, S.weights, S.events.join(' | '), guess, conf, why, DECIDED[`${ww.first_name} ${ww.last_name}`] ?? '', w, s].map(q).join(','))
  }
}
// decided rows last, then the ones needing Kyle first (low, medium, high)
const rank = (r: string) => { const p = r.split('","'); return (p[15] ? 10 : 0) + ({ low: 0, medium: 1, high: 2 } as Record<string, number>)[p[13]] }
const body = rows.slice(1).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
fs.writeFileSync('docs/reviews/no_alias_review.csv', [rows[0], ...body].join('\n') + '\n')
const c: Record<string, number> = {}; for (const r of rows.slice(1)) { const p = r.split('","'); const k = `${p[12]} / ${p[13]}`; c[k] = (c[k] ?? 0) + 1 }
console.log(n, c)
