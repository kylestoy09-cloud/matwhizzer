// Kyle 2026-11-19: "a deep review of everything we did the last two days" — a read-only audit of the data the last
// two days wrote: college results, the Offseason Hub, history / trophy case links, streaming, microcheck. Each line
// is a check and its count; anything not 0 lists examples. Reads only.
//   npx tsx scripts/review_audit_20261119.mts
import { createClient } from '@supabase/supabase-js'
import { matchPool, collegeWeightFits, collegeTimingFits } from '../src/lib/ncaa/match'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(t: string, cols: string, f?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    let q = db.from(t).select(cols).order('id').range(from, from + 999)
    if (f) q = f(q)
    const { data, error } = await q
    if (error) throw new Error(`${t}: ${error.message}`)
    out.push(...(data as T[])); if (data!.length < 1000) break
  }
  return out
}
let problems = 0
function report(label: string, bad: unknown[], show = 6) {
  if (bad.length) problems++
  console.log(`${bad.length ? 'FAIL' : ' ok '} ${String(bad.length).padStart(5)}  ${label}`)
  for (const b of bad.slice(0, show)) console.log('          ', typeof b === 'string' ? b : JSON.stringify(b))
}

const wrestlers = new Map<string, { gender: string; first_name: string; last_name: string }>()
for (const w of await all<{ id: string; gender: string; first_name: string; last_name: string }>('wrestlers', 'id, gender, first_name, last_name')) wrestlers.set(w.id, w)

// ── college ─────────────────────────────────────────────────────────────────────────────────────────────────────
for (const [g, T] of [['M', 'boys'], ['F', 'girls']] as const) {
  console.log(`\n== ${T} college`)
  const ev = await all<{ id: number; year: number; level: string }>(`${T}_college_events`, 'id, year, level')
  const evById = new Map(ev.map(e => [e.id, e]))
  const dupEv = new Map<string, number>(); for (const e of ev) dupEv.set(`${e.level}|${e.year}`, (dupEv.get(`${e.level}|${e.year}`) ?? 0) + 1)
  report('two events for the same level and year', [...dupEv].filter(([, n]) => n > 1).map(([k]) => k))
  const en = await all<{ id: number; event_id: number; weight: number; place: number | null; name: string; wrestler_id: string | null; match_status: string; college_id: number | null; college_raw: string }>(`${T}_college_entries`, 'id, event_id, weight, place, name, wrestler_id, match_status, college_id, college_raw')
  report('matched (auto/confirmed) with no wrestler', en.filter(e => ['auto', 'confirmed'].includes(e.match_status) && !e.wrestler_id).map(e => `${e.id} ${e.name}`))
  report('a wrestler on an unmatched entry (review/none/not_ours)', en.filter(e => !['auto', 'confirmed'].includes(e.match_status) && e.wrestler_id).map(e => `${e.id} ${e.name} ${e.match_status}`))
  report(`matched to a ${g === 'M' ? 'girl' : 'boy'}`, en.filter(e => e.wrestler_id && wrestlers.get(e.wrestler_id)?.gender !== g).map(e => `${e.id} ${e.name}`))
  report('entry with no college', en.filter(e => e.college_id == null).map(e => `${e.id} ${e.name} (${e.college_raw}) ${evById.get(e.event_id)?.level} ${evById.get(e.event_id)?.year}`))
  // one wrestler twice in one championship
  const inEv = new Map<string, number[]>()
  for (const e of en) if (e.wrestler_id) { const k = `${e.event_id}|${e.wrestler_id}`; inEv.set(k, [...(inEv.get(k) ?? []), e.id]) }
  report('one of our wrestlers on two entries of one championship', [...inEv].filter(([, v]) => v.length > 1).map(([k, v]) => `${k} entries ${v}`))
  // one wrestler at two championships in one year (DIII placer at DI is real before ~1990; flag after)
  const yr = new Map<string, Set<string>>()
  for (const e of en) if (e.wrestler_id) { const x = evById.get(e.event_id)!; if (x.year < 1991) continue; const k = `${x.year}|${e.wrestler_id}`; yr.set(k, new Set([...(yr.get(k) ?? []), x.level])) }
  report('one wrestler at two championships in one year (1991 on)', [...yr].filter(([, s]) => s.size > 1).map(([k, s]) => `${k} ${[...s]} ${wrestlers.get(k.split('|')[1])?.last_name}`))
  // places: one of each per weight (ties allowed only as listed)
  const pl = new Map<string, number>()
  for (const e of en) if (e.place) { const k = `${e.event_id}|${e.weight}|${e.place}`; pl.set(k, (pl.get(k) ?? 0) + 1) }
  report('two wrestlers with the same place at one weight', [...pl].filter(([, n]) => n > 1).map(([k]) => { const [eid, w, p] = k.split('|'); const x = evById.get(Number(eid))!; return `${x.level} ${x.year} ${w} place ${p}` }), 10)
  const bad8 = en.filter(e => e.place != null && (e.place < 1 || e.place > 12))
  report('a place outside 1–12', bad8.map(e => `${e.id} ${e.place}`))
  // bouts point at entries of their own event
  const bouts = await all<{ id: number; event_id: number; winner_entry_id: number; loser_entry_id: number | null }>(`${T}_college_bouts`, 'id, event_id, winner_entry_id, loser_entry_id')
  const enById = new Map(en.map(e => [e.id, e]))
  report('bout whose wrestler is from another championship', bouts.filter(b => enById.get(b.winner_entry_id)?.event_id !== b.event_id || (b.loser_entry_id != null && enById.get(b.loser_entry_id)?.event_id !== b.event_id)).map(b => b.id))
  report('bout with the same wrestler on both sides', bouts.filter(b => b.winner_entry_id === b.loser_entry_id).map(b => b.id))
  // weight and timing (the audit rule)
  const pool = new Map((await matchPool(db as never, g)).map(w => [w.id, w]))
  report('auto match failing weight or timing', en.filter(e => e.match_status === 'auto' && e.wrestler_id && pool.get(e.wrestler_id) && (collegeWeightFits(pool.get(e.wrestler_id)!, e.weight) !== 'ok' || !collegeTimingFits(pool.get(e.wrestler_id)!, evById.get(e.event_id)!.year))).map(e => `${e.name} ${evById.get(e.event_id)?.year} ${e.weight}`))
  // colleges with NJ wrestlers lacking colors
  const ids = [...new Set(en.filter(e => e.wrestler_id && e.college_id).map(e => e.college_id!))]
  const { data: cs } = await db.from('colleges').select('id, name, primary_color').in('id', ids)
  report('college with NJ wrestlers and no colors', (cs ?? []).filter(c => !c.primary_color).map(c => c.name))
}

// ── Offseason Hub ───────────────────────────────────────────────────────────────────────────────────────────────
for (const [g, T] of [['M', 'boys'], ['F', 'girls']] as const) {
  console.log(`\n== ${T} offseason hub`)
  const pros = await all<{ id: number; wrestler_id: string | null; first_name: string; last_name: string }>(`${T}_prospects`, 'id, wrestler_id, first_name, last_name')
  report(`prospect linked to a ${g === 'M' ? 'girl' : 'boy'}`, pros.filter(p => p.wrestler_id && wrestlers.get(p.wrestler_id)?.gender !== g).map(p => `${p.id} ${p.first_name} ${p.last_name}`))
  const byW = new Map<string, number[]>(); for (const p of pros) if (p.wrestler_id) byW.set(p.wrestler_id, [...(byW.get(p.wrestler_id) ?? []), p.id])
  report('one wrestler linked from several prospects', [...byW].filter(([, v]) => v.length > 1).map(([w, v]) => `${wrestlers.get(w)?.first_name} ${wrestlers.get(w)?.last_name}: prospects ${v}`), 10)
  const plc = await all<{ id: number; event_id: number; style: string; division: string | null; weight: string; place: number; place_to: number | null; prospect_id: number }>(`${T}_hub_placements`, 'id, event_id, style, division, weight, place, place_to, prospect_id')
  const seen = new Map<string, number>()
  for (const p of plc) if (!p.place_to) { const k = `${p.event_id}|${p.style}|${p.division}|${p.weight}|${p.place}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
  report('two untied placements with one place', [...seen].filter(([, n]) => n > 1).map(([k]) => k), 8)
  const twice = new Map<string, number>(); for (const p of plc) { const k = `${p.event_id}|${p.style}|${p.division}|${p.prospect_id}`; twice.set(k, (twice.get(k) ?? 0) + 1) }
  report('one prospect placed twice in one division of one event', [...twice].filter(([, n]) => n > 1).map(([k]) => k), 8)
  // Super 32: places per year
  const { data: tn } = await db.from(`${T}_hub_tournaments`).select('id').ilike('name', 'super 32 challenge%')
  const { data: evs } = await db.from(`${T}_hub_events`).select('id, season').in('tournament_id', (tn ?? []).map(t => t.id))
  const per = new Map<number, number>(); for (const p of plc) { const e = (evs ?? []).find(x => x.id === p.event_id); if (e) per.set(e.season, (per.get(e.season) ?? 0) + 1) }
  console.log('           Super 32 placements by year:', [...per].sort((a, b) => a[0] - b[0]).map(([y, n]) => `${y}:${n}`).join(' '))
}

// ── history / trophy case ───────────────────────────────────────────────────────────────────────────────────────
console.log('\n== history')
const hf = await all<{ id: number; gender: string; wrestler_id: string | null; name: string }>('history_finishes', 'id, gender, wrestler_id, name')
report('history finish linked to the other side', hf.filter(h => h.wrestler_id && wrestlers.get(h.wrestler_id)?.gender !== h.gender).map(h => `${h.id} ${h.name}`))
report('history finish linked to a wrestler of another last name', hf.filter(h => { if (!h.wrestler_id) return false; const w = wrestlers.get(h.wrestler_id); const ln = (w?.last_name ?? '').toLowerCase().replace(/[^a-z]/g, ''); return ln && !h.name.toLowerCase().replace(/[^a-z]/g, '').includes(ln.slice(0, 5)) }).map(h => `${h.id} ${h.name} → ${wrestlers.get(h.wrestler_id!)?.first_name} ${wrestlers.get(h.wrestler_id!)?.last_name}`))

// ── streaming ───────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\n== streaming')
for (const T of ['boys_streaming_links', 'girls_streaming_links']) {
  const { data } = await db.from(T).select('*')
  const rows = (data ?? []) as Record<string, any>[]
  report(`${T}: a row with neither link`, rows.filter(r => !r.hudl_url && !r.nfhs_url).map(r => r.school_id))
  report(`${T}: a Hudl link not on hudl.com`, rows.filter(r => r.hudl_url && !/^https:\/\/fan\.hudl\.com\//.test(r.hudl_url)).map(r => `${r.school_id} ${r.hudl_url}`))
  report(`${T}: an NFHS link not on nfhsnetwork.com`, rows.filter(r => r.nfhs_url && !/^https:\/\/(www|get)\.nfhsnetwork\.com\/schools\//.test(r.nfhs_url)).map(r => `${r.school_id} ${r.nfhs_url}`))
  report(`${T}: a pick for a link that isn't there`, rows.filter(r => (r.choice === 'hudl' && !r.hudl_url) || (r.choice === 'nfhs' && !r.nfhs_url)).map(r => r.school_id))
  const seasons = new Set(rows.map(r => r.season_id)); console.log(`           seasons: ${[...seasons]}  rows: ${rows.length}`)
}

// ── microcheck ──────────────────────────────────────────────────────────────────────────────────────────────────
console.log('\n== microcheck')
const { data: types } = await db.from('microcheck_task_types').select('*')
report('a check type with an unknown field', (types ?? []).filter(t => t.source === 'school_field' && !['roster_match', 'address', 'website_url', 'twitter_handle', 'facebook_url', 'coach_name', 'coach_email', 'ad_name', 'ad_email', 'stream_choice'].includes(t.field)).map(t => t.key))
report('a queue check type of an unknown kind', (types ?? []).filter(t => t.source === 'queue' && !['tie_resolution', 'college_review', 'college_spot'].includes(t.queue_type)).map(t => `${t.key} ${t.queue_type}`))
const orders = (types ?? []).map(t => t.sort_order); report('two check types with the same order number', orders.filter((o, i) => orders.indexOf(o) !== i))

console.log(`\n${problems} check(s) with findings`)
