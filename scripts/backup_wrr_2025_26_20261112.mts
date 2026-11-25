// Backup of the 2025-26 WRR ratings before the rebuild with the new rules (Kyle 2026-11-12).
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from('wrestler_hammer_scores').select('*').eq('season', '2025-26').order('wrestler_id').range(f, f + 999); if (error) throw error; rows.push(...data); if (data.length < 1000) break }
writeFileSync('docs/migrations/backups/20261112_wrr_2025_26_before_rebuild.json', JSON.stringify(rows))
console.log('backed up', rows.length, 'rows', { M: rows.filter(r => r.gender === 'M').length, F: rows.filter(r => r.gender === 'F').length })
