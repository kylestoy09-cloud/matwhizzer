import { createClient } from '@supabase/supabase-js'
const a = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const names: [string, string][] = [['in_season_tournaments', 'Parsippany Hills Holiday Tournament'], ['in_season_tournaments', 'King of The Castle'], ['in_season_tournaments', 'Burlington County Tournament'], ['in_season_tournaments', 'Mustang Invitational Tournament'], ['in_season_tournaments_girls', 'Overbrook Girls Winter Open 2025'], ['in_season_tournaments_girls', '2025 EB Lady Bear Invitational']]
const RAW = ['Northern Valley Regional (Old Tappan) HS', 'Eastside ( Paterson)', 'Westampton)', 'Sussex Central H S', 'Forfeit Forfeit', 'Red Lion Area Hs', 'Delcastle H S', 'TRINITY HS']
for (const [t, n] of names) {
  const { data } = await a.from(t).select('id').eq('name', n).eq('season', '2025-26').limit(1)
  const id = data?.[0]?.id; if (!id) { console.log('not found', n); continue }
  const html = await (await fetch(`https://matwhizzer.com/tournaments/${id}`)).text()
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<!-- -->/g, '').replace(/<[^>]+>/g, '\n')
  const lines = text.split('\n').map(x => x.trim()).filter(Boolean)
  const raw = RAW.filter(r => lines.some(l => l.includes(r)))
  console.log(`${n}: logos ${(html.match(/<img[^>]+(logo|supabase)[^>]*>/g) ?? []).length}, TBD ${lines.filter(l => l === 'TBD').length}, Unknown ${lines.filter(l => l === 'Unknown').length}, Forfeit ${lines.filter(l => l === 'Forfeit').length}, raw text found: ${raw.join(', ') || 'none'}`)
  await new Promise(r => setTimeout(r, 4000))
}
