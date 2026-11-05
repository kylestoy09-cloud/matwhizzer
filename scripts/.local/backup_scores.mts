import { createClient } from '@supabase/supabase-js'
import fs from 'fs'; import zlib from 'zlib'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const out: any[] = []
  for (let f = 0; ; f += 1000) { const { data, error } = await db.from('wrestler_hammer_scores').select('*').eq('season', '2025-26').eq('gender', g).order('wrestler_id').range(f, f + 999); if (error) throw error; out.push(...data!); if (data!.length < 1000) break }
  fs.writeFileSync(`docs/migrations/backups/20261102_${g === 'M' ? 'boys' : 'girls'}_2025-26_wrr_scores_before_relink.json.gz`, zlib.gzipSync(JSON.stringify(out)))
  console.log(g, out.length)
}
