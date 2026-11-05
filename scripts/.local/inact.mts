import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// inactive non-senior wrestlers who wrestled in 2025-26
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
for (const g of ['M', 'F']) {
  const inact = await all((f, t) => db.from('wrestlers').select('id, grade, created_at').eq('gender', g).eq('is_active', false).order('id').range(f, t))
  const byGrade = inact.reduce((m: any, w: any) => (m[w.grade ?? '-'] = (m[w.grade ?? '-'] ?? 0) + 1, m), {})
  console.log(g, 'inactive by grade', JSON.stringify(byGrade))
}
const log = (await db.from('admin_activity_log').select('action, created_at, details').ilike('action', '%rollover%').order('created_at')).data
console.log('rollovers', JSON.stringify(log?.map((l: any) => [l.action, l.created_at.slice(0, 10), JSON.stringify(l.details).slice(0, 150)])))
