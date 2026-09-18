#!/usr/bin/env tsx
/**
 * Compare W-L records (from dual_meets table, all opponents) against official
 * 2025-26 Power Points RTF. Lists every team with a discrepancy.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'

interface OfficialEntry {
  section: string
  group: string
  rank: number
  team: string
  wins: number
  losses: number
}

function parseOfficialRTF(path: string): OfficialEntry[] {
  const raw = readFileSync(path, 'utf8')
  const entries: OfficialEntry[] = []
  const headerRe = /2025-2026 Wrestling ([^,\\]+),\s*([^\\]+?)\s*Power Points/g
  const headers: Array<{ index: number; section: string; group: string }> = []
  let hm: RegExpExecArray | null
  while ((hm = headerRe.exec(raw)) !== null)
    headers.push({ index: hm.index, section: hm[1].trim(), group: hm[2].trim() })

  for (let si = 0; si < headers.length; si++) {
    const { section, group, index: start } = headers[si]
    const end = si + 1 < headers.length ? headers[si + 1].index : raw.length
    for (const row of raw.slice(start, end).split('\\row')) {
      const team = row.match(/\\strokec10\s+([^\\{}]+?)(?=\\|}|\}\})/)?.[1]?.trim()
      if (!team) continue
      const rank = parseInt(row.match(/\\cf7\s+(\d+)\\cell/)?.[1] ?? '')
      if (isNaN(rank)) continue
      const wl = row.match(/\\cf7\s+(\d+-\d+)\\cell/)
      if (!wl) continue
      const [w, l] = wl[1].split('-').map(Number)
      entries.push({ section, group, rank, team, wins: w, losses: l })
    }
  }
  return entries
}

interface OurSchool {
  id: number
  name: string
  section: string | null
  classification: string | null
  wins: number
  losses: number
}

async function fetchOurRecords(): Promise<OurSchool[]> {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Get all schools
  const { data: schools } = await client
    .from('schools')
    .select('id, display_name, section, classification')
    .eq('is_nj', true)
    .eq('is_combined', false)

  // Fetch all season-2 boys dual meets in pages
  type Meet = { team1_school_id: number; team2_school_id: number; team1_score: number; team2_score: number }
  const meets: Meet[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await client
      .from('dual_meets')
      .select('team1_school_id, team2_school_id, team1_score, team2_score')
      .eq('season_id', 2)
      .eq('gender', 'M')
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .range(from, from + 999)
    if (!data || data.length === 0) break
    meets.push(...(data as Meet[]))
    if (data.length < 1000) break
  }

  // Tally W-L per school from raw meet data
  const wins = new Map<number, number>()
  const losses = new Map<number, number>()
  for (const m of meets) {
    const t1won = m.team1_score > m.team2_score
    wins.set(m.team1_school_id, (wins.get(m.team1_school_id) ?? 0) + (t1won ? 1 : 0))
    losses.set(m.team1_school_id, (losses.get(m.team1_school_id) ?? 0) + (t1won ? 0 : 1))
    wins.set(m.team2_school_id, (wins.get(m.team2_school_id) ?? 0) + (t1won ? 0 : 1))
    losses.set(m.team2_school_id, (losses.get(m.team2_school_id) ?? 0) + (t1won ? 1 : 0))
  }

  return (schools ?? []).map((s: any) => ({
    id: s.id,
    name: s.display_name,
    section: s.section,
    classification: s.classification,
    wins: wins.get(s.id) ?? 0,
    losses: losses.get(s.id) ?? 0,
  })).filter(s => s.wins + s.losses > 0)
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '))
  const shared = [...wa].filter(w => wb.has(w) && w.length > 2).length
  return shared / new Set([...wa, ...wb]).size
}

async function main() {
  const official = parseOfficialRTF(RTF_PATH)
  console.log(`Official entries: ${official.length}`)
  const ours = await fetchOurRecords()
  console.log(`Our DB schools with meet data: ${ours.length}\n`)

  // Load alias → school_id map from DB
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: aliasRows } = await client.from('school_aliases').select('alias, school_id')
  const aliasToId = new Map<string, number>()
  for (const r of aliasRows ?? []) aliasToId.set(r.alias, r.school_id)

  const byName = new Map<string, OurSchool>()
  const byId = new Map<number, OurSchool>()
  for (const s of ours) {
    byName.set(normalize(s.name), s)
    byId.set(s.id, s)
  }

  interface Row { off: OfficialEntry; our: OurSchool; winDiff: number; lossDiff: number; total: number }
  const differ: Row[] = []
  const perfect: Row[] = []
  const unmatched: OfficialEntry[] = []

  for (const off of official) {
    // 1. alias table lookup
    let match = aliasToId.has(off.team) ? (byId.get(aliasToId.get(off.team)!) ?? null) : null
    // 2. exact display_name match
    if (!match) match = byName.get(normalize(off.team)) ?? null
    // 3. similarity fallback
    if (!match) {
      let best = 0, bestEntry: OurSchool | null = null
      for (const s of ours) {
        const sim = similarity(off.team, s.name)
        if (sim > best) { best = sim; bestEntry = s }
      }
      if (best >= 0.55) match = bestEntry
    }
    if (!match) { unmatched.push(off); continue }

    const winDiff = off.wins - match.wins
    const lossDiff = off.losses - match.losses
    const total = winDiff + lossDiff
    const row: Row = { off, our: match, winDiff, lossDiff, total }
    if (total === 0 && winDiff === 0) perfect.push(row)
    else differ.push(row)
  }

  const all = [...differ, ...perfect]
  all.sort((a, b) => b.total - a.total)

  const w = (s: string, n: number) => s.padEnd(n).slice(0, n)
  const wr = (s: string, n: number) => s.padStart(n).slice(-n)

  console.log('='.repeat(90))
  console.log('Team'.padEnd(32) + 'Section/Group'.padEnd(26) + 'Off W-L'.padEnd(10) + 'Our W-L'.padEnd(10) + 'Need')
  console.log('='.repeat(90))

  let totalMissing = 0
  for (const r of all) {
    const offWL = `${r.off.wins}-${r.off.losses}`
    const ourWL = `${r.our.wins}-${r.our.losses}`
    const need = r.total > 0 ? `+${r.total}` : r.total === 0 ? '✓' : String(r.total)
    console.log(
      w(r.off.team, 32) +
      w(`${r.off.section}/${r.off.group}`, 26) +
      w(offWL, 10) +
      w(ourWL, 10) +
      need
    )
    if (r.total > 0) totalMissing += r.total
  }

  console.log('='.repeat(90))
  console.log(`Total missing match-records: ${totalMissing}  (~${Math.round(totalMissing/2)} unique meets)`)

  if (unmatched.length) {
    console.log(`\nNot found in our DB (${unmatched.length}):`)
    for (const u of unmatched)
      console.log(`  ${u.team.padEnd(35)} ${u.section}/${u.group}  ${u.wins}-${u.losses}`)
  }
}

main().catch(console.error)
