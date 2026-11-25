import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const yrs = process.argv[2] ? [Number(process.argv[2])] : [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]
for (const y of yrs) {
  const { data: nj } = await db.from('history_finishes').select('level, region, weight, place, name').eq('gender', 'M').eq('year', y).limit(5000)
  const { events } = readYear(y)
  const codes: Record<string, Record<string, number>> = {}
  const probs: string[] = []
  let stateOk = 0, stateBad: string[] = [], regOk = 0, regBad: string[] = []
  for (const ev of events) {
    const brs = buildBrackets(ev)
    for (const b of brs) {
      for (const x of b.bouts) { (codes[ev.kind] ??= {})[x.round] = (codes[ev.kind][x.round] ?? 0) + 1 }
      for (const p of b.problems) probs.push(`${ev.event} ${b.weight}: ${p}`)
      if (ev.kind === 'state') for (const f of (nj ?? []).filter(f => f.level === 'state' && Number(f.weight) === b.weight)) {
        const ours = b.places.get(f.place)
        if (ours && norm(ours) === norm(f.name)) stateOk++; else stateBad.push(`${b.weight} ${f.place}: njwh ${f.name} / ours ${ours ?? '—'}`)
      }
      if (ev.kind === 'region') for (const f of (nj ?? []).filter(f => f.level === 'region' && f.place === 1 && Number(f.region) === ev.num && Number(f.weight) === b.weight)) {
        const ours = b.places.get(1)
        if (ours && norm(ours) === norm(f.name)) regOk++; else regBad.push(`R${ev.num} ${b.weight}: njwh ${f.name} / ours ${ours ?? '—'}`)
      }
    }
  }
  console.log(`== ${y}: problems ${probs.length} | state placers vs NJWH ${stateOk} match, ${stateBad.length} differ | region champs ${regOk} match, ${regBad.length} differ`)
  for (const k of ['district', 'region', 'state']) console.log(`   ${k}: ${Object.entries(codes[k] ?? {}).sort().map(([r, n]) => `${r} ${n}`).join(', ')}`)
  for (const p of probs.slice(0, 6)) console.log('   PROBLEM', p)
  for (const p of stateBad.slice(0, 6)) console.log('   STATE', p)
  for (const p of regBad.slice(0, 4)) console.log('   REGION', p)
}
