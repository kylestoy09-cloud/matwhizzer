// Kyle 2026-11-18: of the links loaded from Streaming Sites.csv, hide the ones that don't work until they're fixed —
// links whose address names another school (checked against the school's name and town; South River's false alarm
// excluded by hand) and Hudl links with no organization number (".../organization/paulsboro-high-school" errors;
// working ones read ".../organization/16521/..."). Saves the rows first (docs/migrations/backups/) and writes the fix
// list (docs/reviews/streaming_links_to_fix.csv). Dry run unless --apply.
//   npx tsx scripts/hide_bad_streaming_links_20261118.mts [--apply]
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { setStreamingLink, streamingTable } from '../src/lib/streamingLinks'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const WRONG_SCHOOL: Record<number, string> = {   // school → the school its link opens
  128: 'Livingston', 297: 'Manalapan', 310: 'Montville', 263: 'Newton', 190: 'Paramus Catholic', 225: 'Phillipsburg',
  228: 'South Plainfield', 156: 'Sparta', 218: 'St. Joseph (Montvale)', 260: 'Toms River North',
}
const { data: schools } = await db.from('schools').select('id, display_name')
const name = new Map((schools ?? []).map(s => [s.id as number, s.display_name as string]))
const backup: unknown[] = [], fix: string[] = ['school_id,school,gender,season_id,problem,url']
for (const g of ['M', 'F'] as const) {
  const { data } = await db.from(streamingTable(g)).select('*')
  for (const r of (data ?? []) as { school_id: number; season_id: number; url: string }[]) {
    const problem = WRONG_SCHOOL[r.school_id] ? `opens ${WRONG_SCHOOL[r.school_id]}` : /hudl\./i.test(r.url) && !/\/organization\/\d+/.test(r.url) ? 'Hudl link has no organization number' : null
    if (!problem) continue
    backup.push({ table: streamingTable(g), ...r })
    fix.push([r.school_id, `"${name.get(r.school_id) ?? ''}"`, g, r.season_id, problem, r.url].join(','))
  }
}
console.log(`${APPLY ? 'hiding' : 'would hide'} ${backup.length} links (${backup.filter(b => (b as { table: string }).table.startsWith('boys')).length} boys, ${backup.filter(b => (b as { table: string }).table.startsWith('girls')).length} girls)`)
if (APPLY) {
  writeFileSync('docs/migrations/backups/20261118_streaming_links_hidden.json', JSON.stringify(backup, null, 1))
  writeFileSync('docs/reviews/streaming_links_to_fix.csv', fix.join('\n') + '\n')
  for (const b of backup as { table: string; school_id: number; season_id: number }[]) {
    const { error } = await setStreamingLink(db, b.table.startsWith('girls') ? 'F' : 'M', b.school_id, b.season_id, null)
    if (error) throw new Error(`${b.table} ${b.school_id}: ${error}`)
  }
  const left = await Promise.all((['M', 'F'] as const).map(async g => (await db.from(streamingTable(g)).select('*', { count: 'exact', head: true })).count))
  console.log('links left: boys', left[0], 'girls', left[1])
}
