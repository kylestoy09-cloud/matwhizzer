import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const today = (await db.from('wrestler_name_aliases').select('id, raw_name, school_id, wrestler_id, created_at').gte('created_at', '2026-11-05T00:00:00').order('created_at')).data!
const mine = new Set<string>()
for (const f of fs.readdirSync('docs/migrations/backups').filter(f => f.startsWith('20261105'))) { const t = fs.readFileSync('docs/migrations/backups/' + f, 'utf8'); for (const m of t.matchAll(/"raw_name":\s*"([^"]+)",\s*"school_id":\s*(\d+)/g)) mine.add(`${m[1]}|${m[2]}`) }
const hours: Record<string, number> = {}; for (const a of today) { const h = a.created_at.slice(11, 13); hours[h] = (hours[h] ?? 0) + 1 }
console.log('name links created today:', today.length, 'by UTC hour', JSON.stringify(hours))
console.log('admin import activity today:', JSON.stringify(((await db.from('admin_activity_log').select('created_at, action').gte('created_at', '2026-11-05T00:00:00')).data ?? []).reduce((a: any, r: any) => (a[r.action] = (a[r.action] ?? 0) + 1, a), {})))
