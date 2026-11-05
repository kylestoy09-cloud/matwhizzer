import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const all: any[] = []
for (let i = 0; ; i += 1000) { const d = (await db.from('wrestlers').select('id, first_name, last_name, gender').range(i, i + 999)).data!; all.push(...d); if (d.length < 1000) break }
const PH = /^(scratch(ed)?|forfeit|forf|ff|bye|tbd|tba|n\/?a|open|vacant|none|empty|no ?show|x+|-+|\?+|unknown|wrestler|team)$/i
const hits = all.filter(w => PH.test((w.first_name ?? '').trim()) || PH.test((w.last_name ?? '').trim()))
console.log(all.length, 'profiles;', hits.length, 'look like placeholders')
for (const w of hits) console.log(w.gender, w.id.slice(0, 8), JSON.stringify(w.first_name), JSON.stringify(w.last_name))
