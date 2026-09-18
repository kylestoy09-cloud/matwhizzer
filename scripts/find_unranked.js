const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')



const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const RTF_PATH = '/Users/thebrain/Desktop/wrestling_brackets/Whizzer Upload/2025-26 Power Points.rtf'

function parseOfficialNames(path) {
  const raw = readFileSync(path, 'utf8')
  const names = new Set()
  const headerRe = /2025-2026 Wrestling ([^,\\]+),\s*([^\\]+?)\s*Power Points/g
  const headers = []
  let hm
  while ((hm = headerRe.exec(raw)) !== null)
    headers.push({ index: hm.index })
  for (let si = 0; si < headers.length; si++) {
    const start = headers[si].index
    const end = si + 1 < headers.length ? headers[si + 1].index : raw.length
    for (const row of raw.slice(start, end).split('\\row')) {
      const m = row.match(/\\strokec10\s+([^\\{}]+?)(?=\\|}|\}\})/);
      if (m) names.add(m[1].trim())
    }
  }
  return names
}

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similarity(a, b) {
  const na = normalize(a), nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.9
  const wa = new Set(na.split(' ')), wb = new Set(nb.split(' '))
  const shared = [...wa].filter(w => wb.has(w) && w.length > 2).length
  return shared / new Set([...wa, ...wb]).size
}

async function run() {
  const PAGE = 1000
  const meets = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await client.from('dual_meets')
      .select('team1_school_id, team2_school_id')
      .eq('season_id', 2).eq('gender', 'M')
      .not('team1_school_id', 'is', null).not('team2_school_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    meets.push(...data)
    if (data.length < PAGE) break
  }

  const schoolIds = new Set()
  for (const m of meets) { schoolIds.add(m.team1_school_id); schoolIds.add(m.team2_school_id) }

  const { data: schools } = await client.from('schools')
    .select('id, display_name, section, classification')
    .in('id', [...schoolIds])
    .eq('is_nj', true)
    .eq('is_combined', false)

  const meetCount = new Map()
  for (const m of meets) {
    meetCount.set(m.team1_school_id, (meetCount.get(m.team1_school_id) ?? 0) + 1)
    meetCount.set(m.team2_school_id, (meetCount.get(m.team2_school_id) ?? 0) + 1)
  }

  const officialNames = parseOfficialNames(RTF_PATH)

  const unmatched = []
  for (const s of schools) {
    let matched = false
    for (const off of officialNames) {
      if (similarity(s.display_name, off) >= 0.55) { matched = true; break }
    }
    if (!matched) unmatched.push(s)
  }

  unmatched.sort((a, b) => (meetCount.get(b.id) ?? 0) - (meetCount.get(a.id) ?? 0))
  console.log(`NJ active schools with meet data not in official PP doc (${unmatched.length}):`)
  console.log()
  for (const s of unmatched) {
    const cnt = meetCount.get(s.id) ?? 0
    console.log(String(s.id).padStart(4), s.display_name.padEnd(40), (s.section ?? 'no section').padEnd(14), (s.classification ?? 'no class').padEnd(6), cnt + ' meets')
  }
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
