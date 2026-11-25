import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('history_finishes').select('level, region, region_name, weight, place, name, school').eq('gender', 'M').eq('year', 2021).limit(3000)
const st = readYear(2021).events.find(e => e.kind === 'state')!
const brs = buildBrackets(st)
const nj126 = (data ?? []).filter(f => f.level === 'state' && f.weight === '126').map(f => f.name)
console.log('NJWH 126 state:', nj126.join(', '))
for (const b of brs) { const names = [...b.places.values()]; const hit = names.filter(n => nj126.some(x => x.toLowerCase() === n.toLowerCase())).length; if (hit) console.log(`  file ${b.weight}: ${hit} of them`) }
console.log('file 126 entrants', brs.find(b => b.weight === 126)!.entrants.length, 'file weights', brs.map(b => b.weight).join(','))
console.log('NJWH 2021 regions:', [...new Set((data ?? []).filter(f => f.level === 'region').map(f => `${f.region}/${f.region_name}`))].join(' '))
