import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'

function parseOfficialRTF(path: string) {
  const raw = readFileSync(path, 'utf8')
  const entries: { section: string; group: string; team: string; wins: number; losses: number; pp: number }[] = []
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
      const wlMatch = row.match(/\\cf7\s+(\d+)-(\d+)\\cell/)
      if (!wlMatch) continue
      const allNum = [...row.matchAll(/\\cf7\s+([\d.]+)\\cell/g)]
      if (allNum.length < 2) continue
      const pp = parseFloat(allNum[allNum.length - 1][1])
      if (isNaN(pp)) continue
      entries.push({ section, group, team, wins: parseInt(wlMatch[1]), losses: parseInt(wlMatch[2]), pp })
    }
  }
  return entries
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: aliasRows } = await client.from('school_aliases').select('alias, school_id')
const aliasToId = new Map<string, number>()
for (const r of aliasRows ?? []) aliasToId.set(r.alias, r.school_id)

const { data: schoolRows } = await client.from('schools').select('id, display_name').eq('is_nj', true)
const nameToId = new Map<string, number>()
for (const s of schoolRows ?? []) nameToId.set(s.display_name.toLowerCase(), s.id)

const normalize = (n: string) => n.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const entries = parseOfficialRTF(RTF_PATH)
const seenIds = new Map<number, string>()

for (const e of entries) {
  let schoolId = aliasToId.has(e.team) ? aliasToId.get(e.team)! : null
  if (!schoolId) schoolId = nameToId.get(normalize(e.team)) ?? null
  if (!schoolId) continue

  if (seenIds.has(schoolId)) {
    console.log(`DUPLICATE school_id=${schoolId}:`)
    console.log(`  First:  "${seenIds.get(schoolId)}"`)
    console.log(`  Second: "${e.team}" (${e.section} / ${e.group})  ${e.wins}-${e.losses}  ${e.pp}`)
  } else {
    seenIds.set(schoolId, `${e.team} (${e.section} / ${e.group})`)
  }
}
