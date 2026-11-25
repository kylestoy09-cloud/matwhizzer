import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
for (let y = 2019; y <= 2024; y++) {
  const { events, pdfs } = readYear(y, 'F')
  const { data: hf } = await db.from('history_finishes').select('level, region_name, weight, place, name').eq('gender', 'F').eq('year', y).limit(3000)
  const probs: string[] = []; const codes: Record<string, Record<string, number>> = {}; let ok = 0, n = 0; const differ: string[] = []
  for (const e of events) for (const b of buildBrackets(e, 'F')) {
    probs.push(...b.problems.map(p => `${e.event} ${b.weight}: ${p}`))
    for (const x of b.bouts) { (codes[e.kind] ??= {})[x.round] = (codes[e.kind][x.round] ?? 0) + 1 }
    if (e.kind === 'state') for (const f of (hf ?? []).filter(f => f.level === 'state' && Number(f.weight) === b.weight)) { n++; const o = b.places.get(f.place); if (o && norm(o) === norm(f.name)) ok++; else differ.push(`${b.weight} ${f.place} ${f.name}/${o}`) }
  }
  const weights = [...new Set(events.flatMap(e => e.rows.map(r => r.weight)))].sort((a, b) => +a - +b)
  console.log(`== ${y}: events ${events.map(e => `${e.kind}${e.num ?? ''}`).join(',')} | pdf ${pdfs.length} | weights ${weights.join(',')} | problems ${probs.length} | state placers vs history ${ok}/${n}`)
  for (const k of Object.keys(codes)) console.log(`   ${k}: ${Object.entries(codes[k]).sort().map(([r, c]) => `${r} ${c}`).join(', ')}`)
  for (const p of probs.slice(0, 5)) console.log('   PROBLEM', p)
  for (const d of differ.slice(0, 4)) console.log('   DIFF', d)
}
