// Kyle 2026-11-19: "change the streaming column … to two columns, Hudl and NFHS, then fill with the links from the
// streaming folder … add those links to their profiles where we had the broken ones … remove all the broken ones too".
// Every program's links for the upcoming season (the newest season, like coaches) are replaced by the checked links
// (data/streams/streams_20261119.json, from scripts/streams_check_lookup_20261119.mts): the old single links — the
// broken ones among them — are backed up and cleared; each program gets its Hudl and NFHS pages with no pick yet
// (the site shows both until the Stream Account microcheck picks). Needs
// docs/migrations/20261119_streaming_two_links_microcheck_reset.sql. Dry run unless --apply.
//   npx tsx scripts/load_streams_two_links_20261119.mts [--apply]
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = JSON.parse(readFileSync('data/streams/streams_20261119.json', 'utf8')) as { g: 'M' | 'F'; school_id: number; hudl: string | null; nfhs: string | null }[]
const { data: season } = await db.from('seasons').select('id').order('id', { ascending: false }).limit(1).single()
const seasonId = season!.id as number

const { error: colErr } = await db.from('boys_streaming_links').select('hudl_url').limit(1)
if (colErr) throw new Error(`run docs/migrations/20261119_streaming_two_links_microcheck_reset.sql first (${colErr.message})`)

const backup: Record<string, unknown[]> = {}
for (const [g, t] of [['M', 'boys_streaming_links'], ['F', 'girls_streaming_links']] as const) {
  const { data: before } = await db.from(t).select('*').eq('season_id', seasonId)
  backup[t] = before ?? []
  const mine = rows.filter(r => r.g === g)
  console.log(`${t}: ${before?.length ?? 0} rows now → ${mine.length} programs (Hudl ${mine.filter(r => r.hudl).length}, NFHS ${mine.filter(r => r.nfhs).length})`)
  if (!APPLY) continue
  const { error: dErr } = await db.from(t).delete().eq('season_id', seasonId)
  if (dErr) throw new Error(dErr.message)
  const now = new Date().toISOString()
  const { error } = await db.from(t).insert(mine.map(r => ({ school_id: r.school_id, season_id: seasonId, hudl_url: r.hudl, nfhs_url: r.nfhs, url: null, updated_at: now })))
  if (error) throw new Error(`${t}: ${error.message}`)
}
if (APPLY) writeFileSync('docs/migrations/backups/20261119_streaming_links_before_two_links.json', JSON.stringify(backup, null, 1))
console.log(APPLY ? 'loaded (old rows backed up)' : 'dry run')
