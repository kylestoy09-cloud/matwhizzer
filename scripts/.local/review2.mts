import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const R = await import('../../src/app/api/admin/hub/board/route')
const b = (await buildOffseasonBoard('M'))!
const n = b.entries.flatMap(e => e.notable)
console.log('notables', n.length, '| opponents linked to a profile', n.filter(x => x.opponent_wrestler_id).length, '| sample', n.filter(x => x.opponent_wrestler_id).slice(0, 3).map(x => x.opponent).join(', '))
// order save round trip on a real list, then reset
const w = b.weights[0]
await db.from('offseason_board_order').delete().eq('gender', 'M').eq('list', w)   // clear the half-run test first
const ids = (await buildOffseasonBoard('M'))!.lists[w], flipped = [...ids].reverse()
// revalidateTag needs the Next server; locally it throws after the writes
const put = async (x: string[]) => { try { return (await R.PUT(new NextRequest('http://x', { method: 'PUT', body: JSON.stringify({ gender: 'M', season: b.season, list: w, ids: x }) }))).status } catch (e) { return String(e).includes('static generation store') ? 'ok' : String(e) } }
console.log('save reversed', await put(flipped), '| save with one taken off', await put(flipped.slice(1)))
const after = (await buildOffseasonBoard('M'))!
console.log(w, 'first is the old last:', after.lists[w][0] === ids[ids.length - 1], '| saved rows', after.ordered[w].length, 'of', ids.length - 1, '| the one left off still listed (by score, after):', after.lists[w].includes(flipped[0]))
await db.from('offseason_board_order').delete().eq('gender', 'M').eq('list', w)
console.log('reset | back to score order:', JSON.stringify((await buildOffseasonBoard('M'))!.lists[w]) === JSON.stringify(ids))
