import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const R = await import('../../src/app/api/admin/playoff-history/route')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('playoff_history_joins').select('id, a_season, a_name, a_team, b_wrestler_id, decision').eq('gender', 'M').not('b_wrestler_id', 'is', null).eq('decision', 'pending')
const by = new Map<string, any[]>(); for (const j of data ?? []) { const k = `${j.a_season}|${j.a_name}|${j.a_team}`; (by.get(k) ?? by.set(k, []).get(k)!).push(j) }
const pair = [...by.values()].find(v => new Set(v.map(x => x.b_wrestler_id)).size > 1)
if (!pair) { console.log('no history line with two different profile maybes'); process.exit(0) }
console.log('test:', pair[0].a_name, pair.length, 'profile maybes')
const res = await R.POST(new NextRequest('http://x', { method: 'POST', body: JSON.stringify({ gender: 'M', action: 'decide', ids: pair.slice(0, 2).map(x => x.id), decision: 'same' }) }))
console.log('status', res.status, JSON.stringify(await res.json()))
const { data: after } = await db.from('playoff_history_joins').select('decision').in('id', pair.slice(0, 2).map(x => x.id))
console.log('decisions after (should still be pending):', after?.map(x => x.decision))
