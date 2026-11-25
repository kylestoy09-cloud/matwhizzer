// Kyle 2026-11-16: "Parsippany Hills Holiday Tournament and Gary Vittorio Holiday Classic are the same tournament".
// The 2026-27 Gary Vittorio Holiday Classic becomes this season's edition of 2025-26 Parsippany Hills Holiday
// Tournament (prior_id + its settings), as the Tournament Hub's merge does. Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NEW = '3d365cf7-3dd5-4834-9952-8e7b9b62c2c3', PRIOR = '986c6502-684b-4f86-a530-aa7c8133041b'
const { data: t } = await db.from('in_season_tournaments').select('*').eq('id', NEW).single()
const { data: p } = await db.from('in_season_tournaments').select('*').eq('id', PRIOR).single()
const { data: reg } = await db.from('tournament_registry').select('*').eq('in_season_tournament_id', NEW)
if (t.prior_id) throw new Error('already linked')
writeFileSync('docs/migrations/backups/20261116_merge_vittorio_parsippany.json', JSON.stringify({ tournament: t, registry: reg }, null, 1))
const patch: Record<string, unknown> = { prior_id: PRIOR }
for (const k of ['location', 'source_format', 'tournament_type', 'venue_name', 'venue_address', 'location_school_id', 'banner_bg', 'banner_fg', 'podium_depth', 'point_value']) patch[k] = p[k] ?? null
const { error } = await db.from('in_season_tournaments').update(patch).eq('id', NEW)
if (error) throw error
if (p.point_value != null) await db.from('tournament_registry').update({ point_value: p.point_value }).eq('in_season_tournament_id', NEW).is('point_value', null)
const { data: after } = await db.from('in_season_tournaments').select('name, start_date, prior_id, tournament_type, source_format, point_value').eq('id', NEW).single()
console.log(after, 'prior:', p.name, p.tournament_type, p.source_format, p.point_value)
