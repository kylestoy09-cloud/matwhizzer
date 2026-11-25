// The National Duals bouts loaded earlier today used names before two reader fixes (siblings told apart by weight;
// names the copy lists under the other team, where the earlier load reversed winner and loser). Back up and remove
// those bouts, and the prospects created only for an unexpanded name ("B. Collins") that nothing else uses; then
// load_duals_20261113.mts reloads them. Backup: docs/migrations/backups/20261113_national_duals_bouts.json. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const backup: any = {}
for (const [pool, name] of [['boys', 'NHSCA National Duals'], ['girls', 'NHSCA National Duals'], ['mixed', 'NHSCA National Duals (MS Division)']]) {
  const { data: t } = await db.from(`${pool}_hub_tournaments`).select('id').eq('name', name).single()
  const { data: evs } = await db.from(`${pool}_hub_events`).select('id').eq('tournament_id', t!.id)
  const ids = (evs ?? []).map(e => e.id)
  const bouts: any[] = []
  for (let a = 0; ; a += 1000) { const { data } = await db.from(`${pool}_hub_bouts`).select('*').in('event_id', ids).order('id').range(a, a + 999); bouts.push(...data!); if (data!.length < 1000) break }
  const kidIds = [...new Set(bouts.flatMap(b => [b.winner_prospect_id, b.loser_prospect_id]))]
  const abbrev: any[] = []
  for (let i = 0; i < kidIds.length; i += 300) { const { data } = await db.from(`${pool}_prospects`).select('*').in('id', kidIds.slice(i, i + 300)).like('first_name', '_.'); abbrev.push(...(data ?? [])) }
  backup[pool] = { bouts, abbrev_prospects: abbrev }
  console.log(`${pool}: bouts ${bouts.length}, prospects under an unexpanded name ${abbrev.length}`)
  if (process.argv[2] === 'go') {
    for (let i = 0; i < bouts.length; i += 500) { const { error } = await db.from(`${pool}_hub_bouts`).delete().in('id', bouts.slice(i, i + 500).map(b => b.id)); if (error) throw error }
    for (const p of abbrev) {
      const [{ count: a1 }, { count: a2 }, { count: a3 }] = await Promise.all([
        db.from(`${pool}_hub_placements`).select('*', { count: 'exact', head: true }).eq('prospect_id', p.id),
        db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).eq('winner_prospect_id', p.id),
        db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).eq('loser_prospect_id', p.id)])
      if (!a1 && !a2 && !a3 && !p.wrestler_id) { const { error } = await db.from(`${pool}_prospects`).delete().eq('id', p.id); if (error) throw error }
    }
  }
}
writeFileSync('docs/migrations/backups/20261113_national_duals_bouts.json', JSON.stringify(backup))
console.log(process.argv[2] === 'go' ? 'removed' : '(dry run)')
