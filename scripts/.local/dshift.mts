import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('playoff_history_schools').select('note, decision').eq('gender', 'M').eq('decision', 'auto')
const shift: Record<string, number> = {}
for (const r of data ?? []) { const m = /back then District ([\d/]+), now District (\d+)/.exec(r.note ?? ''); if (!m) continue; const then = Number(m[1].split('/')[0]), now = Number(m[2]); const sameRegion = Math.ceil(then / 4) === Math.ceil(now / 4); shift[sameRegion ? 'same region' : 'other region'] = (shift[sameRegion ? 'same region' : 'other region'] ?? 0) + 1 }
console.log('auto matches', data?.length, '| flagged', shift)
