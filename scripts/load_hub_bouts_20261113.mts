// Head-to-head bouts for the tournament hubs (Kyle 2026-11-13: "if a nj wrestler beats or has a close match with a
// highly ranked wrestler, we can see that"). The bout files already used for placements hold every match; each bout
// is read with its bracket's division and weight (src/lib/hubFiles.ts podiumsFromBouts, the same split as the
// placements) and stored on the pool whose placements hold both kids in that division and weight, under the same
// prospects. A bout between kids on two different pools (a 14U 8th grader v a high schooler) is skipped.
// Events with placements copies only (Fargo, Northeast Regional, Mobbin) have no bouts. Usage: [go]
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as H from '../src/lib/hubFiles'
import { PLANS } from './.local/hub_plans.mts'
import { hubSeasonOfDate } from '../src/lib/hub'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const POOL = { M: 'boys', F: 'girls', X: 'mixed' } as const
const read = (f: string) => H.rtfToText(readFileSync(`${B}/${f}${f.endsWith('.rtfd') ? '/TXT.rtf' : ''}`, 'utf8'))
const lower = (s: string) => s.toLowerCase().trim()
const toDate = (d: string) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim()); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null }
let total = 0
for (const p of PLANS) {
  const boutFile = p.files.find(f => f.endsWith('.csv'))
  if (!boutFile) continue
  const roster = p.files.filter(f => !f.endsWith('.csv')).flatMap(f => H.parseRoster(read(f)))
  const got = H.podiumsFromBouts(readFileSync(`${B}/${boutFile}`, 'utf8'), H.rosterIndex(roster))
  // each pool's event for this plan, and its placements' kids by division + weight + name (and division + name)
  const pools: { pool: string; eventId: number; byDWN: Map<string, number>; byDN: Map<string, number[]>; style: Map<string, string> }[] = []
  for (const [k, tName] of Object.entries(p.tournaments) as ['M' | 'F' | 'X', string][]) {
    const pool = POOL[k], season = p.date ? hubSeasonOfDate(k === 'X' ? 'ms' : 'offseason', p.date) : 2026
    const { data: t } = await db.from(`${pool}_hub_tournaments`).select('id').eq('name', tName).maybeSingle()
    if (!t) continue
    const { data: ev } = await db.from(`${pool}_hub_events`).select('id').eq('tournament_id', t.id).eq('season', season).maybeSingle()
    if (!ev) continue
    const { count } = await db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).eq('event_id', ev.id)
    if (count) { console.log(`${p.label} ${pool}: bouts already loaded (${count}), skipped`); continue }
    const pl: any[] = []
    for (let a = 0; ; a += 1000) { const { data } = await db.from(`${pool}_hub_placements`).select('division, style, weight, name_listed, prospect_id').eq('event_id', ev.id).order('id').range(a, a + 999); pl.push(...data!); if (data!.length < 1000) break }
    const byDWN = new Map<string, number>(), byDN = new Map<string, number[]>(), style = new Map<string, string>()
    for (const r of pl) {
      byDWN.set(`${lower(r.division ?? '')}|${r.weight}|${lower(r.name_listed)}`, r.prospect_id)
      const k2 = `${lower(r.division ?? '')}|${lower(r.name_listed)}`; byDN.set(k2, [...new Set([...(byDN.get(k2) ?? []), r.prospect_id])])
      style.set(lower(r.division ?? ''), r.style)
    }
    pools.push({ pool, eventId: ev.id, byDWN, byDN, style })
  }
  const find = (P: typeof pools[number], d: string, w: string, n: string) => P.byDWN.get(`${lower(d)}|${w}|${lower(n)}`) ?? P.byDWN.get(`${lower(d)}|${w.replace(/ Pool [A-Z]$/, '')}|${lower(n)}`) ?? (P.byDN.get(`${lower(d)}|${lower(n)}`)?.length === 1 ? P.byDN.get(`${lower(d)}|${lower(n)}`)![0] : undefined)
  const ins = new Map<string, any[]>(); let crossPool = 0, unplaced = 0
  for (const { division, weight, bout } of got.bouts) {
    let done = false
    for (const P of pools) {
      const w = find(P, division, weight, bout.winner), l = find(P, division, weight, bout.loser)
      if (w && l) {
        ins.set(P.pool, [...(ins.get(P.pool) ?? []), { event_id: P.eventId, style: P.style.get(lower(division)) ?? 'folkstyle', division, weight, bout_date: toDate(bout.date), round: bout.round || null,
          winner_listed: bout.winner, winner_club_listed: bout.winTeam || null, winner_prospect_id: w, loser_listed: bout.loser, loser_club_listed: bout.loseTeam || null, loser_prospect_id: l, win_type: bout.winType || null, score: bout.result || null }])
        done = true; break
      }
      if (w || l) crossPool++
    }
    if (!done && !pools.some(P => find(P, division, weight, bout.winner) || find(P, division, weight, bout.loser))) unplaced++
  }
  const n = [...ins.values()].reduce((a, x) => a + x.length, 0); total += n
  console.log(`${p.label}: ${got.bouts.length} bouts in the file → ${n} to load (${[...ins].map(([k, v]) => `${k} ${v.length}`).join(', ')}); one kid on another pool ${crossPool}; divisions not tracked ${unplaced}`)
  if (process.argv[2] === 'go') for (const [pool, rows] of ins) for (let i = 0; i < rows.length; i += 500) { const { error } = await db.from(`${pool}_hub_bouts`).insert(rows.slice(i, i + 500)); if (error) throw new Error(`${p.label} ${pool}: ${error.message}`) }
}
console.log('total', total, process.argv[2] === 'go' ? 'loaded' : '(dry run)')
