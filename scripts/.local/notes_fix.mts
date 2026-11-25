import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const set = async (g: string, name: string, notes: string | null) => {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
  const { data: e } = await db.from(`${g}_hub_events`).select('id, notes').eq('tournament_id', t!.id).eq('season', g === 'mixed' && name.startsWith('Journeymen') ? 2027 : 2026).single()
  console.log(g, name, '| was:', e!.notes)
  await db.from(`${g}_hub_events`).update({ notes }).eq('id', e!.id)
}
await set('boys', 'Journeymen Fall Classic', "Main 120, 135, 145, 152, 160, 170 and Over 120, 135, 145, 152, 160, 215 are from Flo's placements copy (Over: top 4 only); the rest from the bout file.")
await set('boys', 'USAW-NJ Freestyle & Greco State Championships', "Brackets the bout file couldn't place are from Flo's placements copy (top 4).")
await set('girls', 'USAW-NJ Freestyle & Greco State Championships', "Brackets the bout file couldn't place are from Flo's placements copy (top 4).")
const { data: t } = await db.from('mixed_hub_tournaments').select('id').eq('name', 'USAW-NJ Freestyle & Greco State Championships (Youth / 14U)').single()
const { data: e } = await db.from('mixed_hub_events').select('notes').eq('tournament_id', t!.id).single()
console.log('mixed NJ FS note:', e!.notes)
