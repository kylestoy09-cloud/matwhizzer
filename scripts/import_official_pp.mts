#!/usr/bin/env tsx
/**
 * Import official 2025-26 Power Points from RTF into the power_points table.
 * Replaces computed PP values with the official NJSIAA published figures.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'
const SEASON = 2
const GENDER = 'M'

interface OfficialEntry {
  section: string
  group: string
  rank: number
  team: string
  wins: number
  losses: number
  pct: number
  pp: number
}

function parseOfficialRTF(path: string): OfficialEntry[] {
  const raw = readFileSync(path, 'utf8')
  const entries: OfficialEntry[] = []

  const headerRe = /2025-2026 Wrestling ([^,\\]+),\s*([^\\]+?)\s*Power Points/g
  const headers: { index: number; section: string; group: string }[] = []
  let hm: RegExpExecArray | null
  while ((hm = headerRe.exec(raw)) !== null)
    headers.push({ index: hm.index, section: hm[1].trim(), group: hm[2].trim() })

  for (let si = 0; si < headers.length; si++) {
    const { section, group, index: start } = headers[si]
    const end = si + 1 < headers.length ? headers[si + 1].index : raw.length

    for (const row of raw.slice(start, end).split('\\row')) {
      const team = row.match(/\\strokec10\s+([^\\{}]+?)(?=\\|}|\}\})/)?.[1]?.trim()
      if (!team) continue
      const rankMatch = row.match(/\\cf7\s+(\d+)\\cell/)
      if (!rankMatch) continue
      const rank = parseInt(rankMatch[1])
      const wlMatch = row.match(/\\cf7\s+(\d+)-(\d+)\\cell/)
      if (!wlMatch) continue
      const wins = parseInt(wlMatch[1])
      const losses = parseInt(wlMatch[2])
      const allNumCells = [...row.matchAll(/\\cf7\s+([\d.]+)\\cell/g)]
      if (allNumCells.length < 2) continue
      const pp = parseFloat(allNumCells[allNumCells.length - 1][1])
      const pct = wins + losses > 0 ? wins / (wins + losses) : 0
      if (isNaN(pp)) continue
      entries.push({ section, group, rank, team, wins, losses, pct, pp })
    }
  }
  return entries
}

async function main() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const entries = parseOfficialRTF(RTF_PATH)
  console.log(`Parsed ${entries.length} official entries from RTF`)

  // Load alias → school_id
  const { data: aliasRows } = await client.from('school_aliases').select('alias, school_id')
  const aliasToId = new Map<string, number>()
  for (const r of aliasRows ?? []) aliasToId.set(r.alias, r.school_id)

  // Load schools → id by display_name
  const { data: schoolRows } = await client
    .from('schools')
    .select('id, display_name')
    .eq('is_nj', true)
  const nameToId = new Map<string, number>()
  for (const s of schoolRows ?? []) nameToId.set(s.display_name.toLowerCase(), s.id)

  let matched = 0
  let unmatched = 0
  const upsertRows: {
    school_id: number
    season_id: number
    gender: string
    power_points: number
    overall_wins: number
    overall_losses: number
    meets_counted: number
  }[] = []

  for (const e of entries) {
    // 1. alias lookup
    let schoolId = aliasToId.has(e.team) ? aliasToId.get(e.team)! : null
    // 2. exact display_name
    if (!schoolId) schoolId = nameToId.get(e.team.toLowerCase()) ?? null

    if (!schoolId) {
      console.warn(`  UNMATCHED: ${e.team} (${e.section} / ${e.group})`)
      unmatched++
      continue
    }

    upsertRows.push({
      school_id: schoolId,
      season_id: SEASON,
      gender: GENDER,
      power_points: e.pp,
      overall_wins: e.wins,
      overall_losses: e.losses,
      meets_counted: e.wins + e.losses,
    })
    matched++
  }

  // Deduplicate by school_id (in case two RTF names resolved to the same school)
  const deduped = new Map<number, typeof upsertRows[0]>()
  for (const r of upsertRows) deduped.set(r.school_id, r)
  const finalRows = [...deduped.values()]
  console.log(`Matched: ${matched}  Unmatched: ${unmatched}  Dupes removed: ${upsertRows.length - finalRows.length}`)

  // Delete existing rows for these schools then re-insert to avoid silent upsert no-ops
  const schoolIds = finalRows.map(r => r.school_id)
  const { error: delErr } = await client
    .from('power_points')
    .delete()
    .in('school_id', schoolIds)
    .eq('season_id', SEASON)
    .eq('gender', GENDER)
  if (delErr) { console.error('Delete failed:', delErr.message); process.exit(1) }

  console.log(`Inserting ${finalRows.length} rows...`)
  const { error: insErr } = await client.from('power_points').insert(finalRows)
  if (insErr) { console.error('Insert failed:', insErr.message); process.exit(1) }

  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
