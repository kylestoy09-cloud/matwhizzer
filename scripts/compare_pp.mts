#!/usr/bin/env tsx
/**
 * Compare our computed Power Points against the official 2025-26 Power Points RTF.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'

// ── Parse RTF ────────────────────────────────────────────────────────────────

interface OfficialEntry {
  section: string
  group: string
  rank: number
  team: string
  wl: string
  pp: number
}

function parseOfficialRTF(path: string): OfficialEntry[] {
  const raw = readFileSync(path, 'utf8')
  const entries: OfficialEntry[] = []

  // Extract section/group headers like:
  // "2025-2026 Wrestling Central Jersey, Group 1 Power Points"
  // "2025-2026 Wrestling North I, Group 4 Power Points"
  // "2025-2026 Wrestling Non-Public, Group A Power Points"
  const headerRe = /2025-2026 Wrestling ([^,\\]+),\s*([^\\]+?)\s*Power Points/g

  // Build list of (index, section, group)
  const sectionHeaders: Array<{ index: number; section: string; group: string }> = []
  let hm: RegExpExecArray | null
  while ((hm = headerRe.exec(raw)) !== null) {
    sectionHeaders.push({
      index: hm.index,
      section: hm[1].trim(),
      group: hm[2].trim(),
    })
  }

  for (let si = 0; si < sectionHeaders.length; si++) {
    const { section, group, index: start } = sectionHeaders[si]
    const end = si + 1 < sectionHeaders.length ? sectionHeaders[si + 1].index : raw.length
    const chunk = raw.slice(start, end)

    // Split on \row to get individual table rows
    const tableRows = chunk.split('\\row')

    for (const row of tableRows) {
      // Extract team name from hyperlink: {\fldrslt \cf10 \strokec10 TeamName}}
      // Must use strokec10 specifically (blue link color) to avoid matching strokec7 used for rank "1"
      const teamMatch = row.match(/\\strokec10\s+([^\\{}]+?)(?=\\|}|\}\})/)?.[1]?.trim()
      if (!teamMatch) continue

      // Extract rank: first \cf7 <digits>\cell
      const rankMatch = row.match(/\\cf7\s+(\d+)\\cell/)
      if (!rankMatch) continue
      const rank = parseInt(rankMatch[1])

      // Extract W-L: pattern like \cf7 24-0\cell
      const wlMatch = row.match(/\\cf7\s+(\d+-\d+)\\cell/)
      const wl = wlMatch?.[1] ?? '?'

      // Extract PP: last \cf7 <number>\cell in the row (after W-L and PCT)
      // PP is the last numeric cell
      const allNumCells = [...row.matchAll(/\\cf7\s+([\d.]+)\\cell/g)]
      if (allNumCells.length < 2) continue
      // Last one is PP (after rank, W-L count won't be just a decimal)
      const ppStr = allNumCells[allNumCells.length - 1][1]
      const pp = parseFloat(ppStr)
      if (isNaN(pp)) continue

      entries.push({ section, group, rank, team: teamMatch, wl, pp })
    }
  }

  return entries
}

// ── Query our DB ─────────────────────────────────────────────────────────────

interface OurEntry {
  schoolId: number
  name: string
  pp: number
  wins: number
  losses: number
  section: string | null
  classification: string | null
}

async function fetchOurPP(): Promise<OurEntry[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const client = createClient(url, key)

  const { data, error } = await client
    .from('power_points')
    .select(`school_id, power_points, overall_wins, overall_losses, schools!inner(display_name, section, classification)`)
    .eq('season_id', 2)
    .eq('gender', 'M')

  if (error) throw new Error(`DB error: ${error.message}`)

  return (data ?? []).map((r: any) => ({
    schoolId: r.school_id,
    name: r.schools.display_name,
    pp: Number(r.power_points),
    wins: r.overall_wins,
    losses: r.overall_losses,
    section: r.schools.section,
    classification: r.schools.classification,
  }))
}

// ── Match & Compare ───────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const wa = new Set(na.split(' '))
  const wb = new Set(nb.split(' '))
  const intersection = [...wa].filter(w => wb.has(w) && w.length > 2).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Parsing official RTF...')
  const official = parseOfficialRTF(RTF_PATH)
  console.log(`Found ${official.length} official entries`)

  if (official.length === 0) {
    // Debug: show first few matches
    const raw = readFileSync(RTF_PATH, 'utf8')
    const sampleMatch = raw.match(/2025-2026 Wrestling [^\\]+Power Points/)
    console.log('Sample header match:', sampleMatch?.[0])
    const strokeMatch = raw.match(/\\strokec\d+\s+[^\\{}]+/)
    console.log('Sample strokec match:', strokeMatch?.[0])
    return
  }

  console.log('Fetching our computed PP from DB...')
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const ours = await fetchOurPP()
  console.log(`Found ${ours.length} schools in our DB\n`)

  // Load alias → school_id map from DB
  const { data: aliasRows } = await client.from('school_aliases').select('alias, school_id')
  const aliasToId = new Map<string, number>()
  for (const r of aliasRows ?? []) aliasToId.set(r.alias, r.school_id)

  // Build our lookups by name and by school_id
  const ourByName = new Map<string, OurEntry>()
  const ourById = new Map<number, OurEntry>()
  for (const o of ours) {
    ourByName.set(normalize(o.name), o)
    ourById.set(o.schoolId, o)
  }

  interface CompRow {
    official: OfficialEntry
    ours: OurEntry | null
    diff: number
  }

  const rows: CompRow[] = []
  const unmatchedOfficial: OfficialEntry[] = []

  for (const off of official) {
    // 1. alias table lookup
    let match = aliasToId.has(off.team) ? (ourById.get(aliasToId.get(off.team)!) ?? null) : null
    // 2. exact display_name match
    if (!match) match = ourByName.get(normalize(off.team)) ?? null
    // 3. similarity fallback
    if (!match) {
      let best = 0
      let bestEntry: OurEntry | null = null
      for (const [, entry] of ourByName) {
        const sim = similarity(off.team, entry.name)
        if (sim > best) { best = sim; bestEntry = entry }
      }
      if (best >= 0.55) match = bestEntry
    }

    if (match) {
      rows.push({ official: off, ours: match, diff: match.pp - off.pp })
    } else {
      rows.push({ official: off, ours: null, diff: NaN })
      unmatchedOfficial.push(off)
    }
  }

  // Sort by abs diff descending (unmatched at end)
  rows.sort((a, b) => {
    if (!a.ours && !b.ours) return 0
    if (!a.ours) return 1
    if (!b.ours) return -1
    return Math.abs(b.diff) - Math.abs(a.diff)
  })

  const w = (s: string, n: number) => s.padEnd(n).slice(0, n)
  const wr = (s: string, n: number) => s.padStart(n).slice(-n)

  console.log('='.repeat(95))
  console.log('POWER POINTS COMPARISON: Official vs Our Computation  (sorted by largest diff first)')
  console.log('='.repeat(95))
  console.log(w('Team', 30) + w('Section / Group', 24) + wr('Official', 10) + wr('Ours', 10) + wr('Diff', 9))
  console.log('-'.repeat(95))

  let matchedCount = 0, totalAbsDiff = 0, bigDiffs = 0
  for (const r of rows) {
    if (!r.ours) {
      console.log(w(r.official.team, 30) + w(`${r.official.section} / ${r.official.group}`, 24) + wr(r.official.pp.toFixed(2), 10) + wr('N/A', 10) + wr('---', 9))
      continue
    }
    matchedCount++
    const absDiff = Math.abs(r.diff)
    totalAbsDiff += absDiff
    if (absDiff >= 2) bigDiffs++
    const diffStr = (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2)
    const flag = absDiff >= 3 ? '  !!!!' : absDiff >= 2 ? '  !!' : absDiff >= 1 ? '  !' : ''
    console.log(
      w(r.official.team, 30) +
      w(`${r.official.section} / ${r.official.group}`, 24) +
      wr(r.official.pp.toFixed(2), 10) +
      wr(r.ours.pp.toFixed(2), 10) +
      wr(diffStr, 9) + flag
    )
  }
  console.log('='.repeat(95))
  console.log(`Matched: ${matchedCount}/${official.length}  |  Avg abs diff: ${matchedCount > 0 ? (totalAbsDiff / matchedCount).toFixed(3) : 'N/A'}  |  Diffs ≥2: ${bigDiffs}  |  Diffs <1: ${rows.filter(r => r.ours && Math.abs(r.diff) < 1).length}`)

  if (unmatchedOfficial.length > 0) {
    console.log(`\nUnmatched in official RTF (${unmatchedOfficial.length}):`)
    for (const u of unmatchedOfficial) {
      console.log(`  ${u.team.padEnd(35)} ${u.section} / ${u.group}  =  ${u.pp}`)
    }
  }

  const matchedOurIds = new Set(rows.filter(r => r.ours).map(r => r.ours!.schoolId))
  const ourUnmatched = ours.filter(o => !matchedOurIds.has(o.schoolId))
  if (ourUnmatched.length > 0 && ourUnmatched.length <= 30) {
    console.log(`\nIn our DB but not in official (${ourUnmatched.length}):`)
    for (const u of ourUnmatched) {
      console.log(`  ${u.name.padEnd(35)} ${u.section ?? '?'} / ${u.classification ?? '?'}  =  ${u.pp}`)
    }
  } else if (ourUnmatched.length > 30) {
    console.log(`\n${ourUnmatched.length} schools in our DB not matched to official (too many to list — likely combined/JV teams)`)
  }
}

main().catch(console.error)
