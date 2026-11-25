import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const clean = (n: string) => n
  .replace(/\s*-\s*\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/, '')
  .replace(/\b(19|20)\d{2}\b/g, '')
  .replace(/\b\d+(st|nd|rd|th)\b/gi, '')
  .replace(/\bAnnual\b/gi, '')
  .replace(/\bWrestling\b/gi, '')
  .replace(/\bHigh School\b/gi, '')
  .replace(/\bGirls'?|\bGirl[`'’]s\b/gi, '')
  .replace(/\s+/g, ' ').replace(/\s+([,)])/g, '$1').trim()
for (const t of ['in_season_tournaments', 'in_season_tournaments_girls']) {
  const { data } = await db.from(t).select('id,name').eq('season', '2025-26').order('start_date')
  for (const r of data ?? []) { const c = clean(r.name); console.log(`${t === 'in_season_tournaments' ? 'B' : 'G'}\t${r.name}\t${c === r.name ? '' : c}`) }
}
