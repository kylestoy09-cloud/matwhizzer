import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('name', 'Boy_s Districts District 9')).data![0].id
const ws = (await db.from('wrestlers').select('id').eq('first_name', 'Peter').eq('last_name', 'Terranova')).data!.map((x: any) => x.id)
const e = (await db.from('tournament_entries').select('id, weight_class_id').eq('tournament_id', t).in('wrestler_id', ws)).data!
for (const x of e as any[]) console.log('Terranova D9 entry', x.id.slice(0, 8), 'wc', x.weight_class_id, JSON.stringify((await db.from('matches').select('round, win_type, loser_entry_id').or(`winner_entry_id.eq.${x.id},loser_entry_id.eq.${x.id}`)).data))
const bk = JSON.parse((await import('fs')).readFileSync('docs/migrations/backups/20261102_placeholder_entries_before.json', 'utf8'))
console.log('11/02 cleanup backup keys:', Object.keys(bk).join(', '))
const ms = bk.matches ?? bk.plan ?? []
console.log('cleanup bout actions:', JSON.stringify((Array.isArray(ms) ? ms : []).slice(0, 2)).slice(0, 400))
