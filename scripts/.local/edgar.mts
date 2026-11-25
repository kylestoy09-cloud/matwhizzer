import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
import { hubLeaderboard } from '../../src/lib/hubLeaderboard'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = (await buildOffseasonBoard('M'))!
const e = b.entries.find(x => x.name.includes('Edgar') && x.name.includes('Santino'))!
console.log('events', e.events, '| finishes', e.finishes.map(f => `${f.tournament} ${f.division ?? ''} ${f.weight} ${f.place}`), '| wrestled', e.wrestled)
const { rows } = await hubLeaderboard(db as any, 'M', 'offseason', { season: 2026, onlyNj: true, sex: null })
const r = rows.find(x => x.wrestler?.id === e.wrestler_id)!
console.log('all finishes', r.finishes.map(f => `${f.season} ${f.tournament} ${f.style} ${f.weight} ${f.place}`))
