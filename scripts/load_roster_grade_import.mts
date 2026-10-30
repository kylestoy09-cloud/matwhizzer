// Loads Track Wrestling team rosters into roster_grade_import for one gender and
// season, for the Roster Grade Import tool (/admin/roster-grade-import or
// /admin/roster-grade-import-girls).
//
//   node --env-file=.env.local scripts/load_roster_grade_import.mts <M|F> <season id> <file.rtf|.txt> <import batch>           dry run
//   node --env-file=.env.local scripts/load_roster_grade_import.mts <M|F> <season id> <file.rtf|.txt> <import batch> --apply   insert
//
// The file is Track's "Edit Team → Roster" pages pasted one after another. Each
// school starts with "<School> Roster" followed by the "Edit Team Roster Schedule
// Matches Statistics" nav line, then the Name / Eligible / Wt. Class / Gender /
// Grade / Record headers, then one value per line per wrestler. Weight and grade
// are sometimes blank, so each wrestler is found by the Gender value (M/F): the
// line before it is the weight when it is a number, and the name before that.
//
// Rows load as status 'pending' (schools are matched in the tool). Rows with no
// grade or no name are left out. Rows whose Gender column differs from
// the import's gender are loaded but listed, since Track's Gender field is
// sometimes wrong on a team's own roster. The load stops if most rows are the
// other gender (wrong file) or if this season and gender already has rows.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { execFileSync } from 'child_process'

const [gender, seasonArg, file, batch, flag] = process.argv.slice(2)
if (!['M', 'F'].includes(gender) || !seasonArg || !file || !batch) throw new Error('usage: <M|F> <season id> <file.rtf|.txt> <import batch> [--apply]')
const seasonId = Number(seasonArg)
const APPLY = flag === '--apply'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ── Read ─────────────────────────────────────────────────────────────────────
const text = file.toLowerCase().endsWith('.rtf')
  ? execFileSync('textutil', ['-convert', 'txt', '-stdout', file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  : readFileSync(file, 'utf8')
const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

// ── Parse ────────────────────────────────────────────────────────────────────
const HEADERS = new Set(['Help', 'Name', 'Eligible', 'Wt. Class', 'Gender', 'Grade', 'Record'])
const GRADE = /^(Fr|So|Jr|Sr)\.?$/
const RECORD = /^\d+-\d+(-\d+)?$/
type Row = { school: string; name: string; weight: number | null; gender: string; grade: string | null }
const rows: Row[] = []
const problems: string[] = []
const noName: string[] = []   // Track rows with a blank name (left out)
let school: string | null = null
let toks: string[] = []

function flush() {
  if (school == null) return
  let j = 0
  while (j < toks.length) {
    let k = j
    while (k < toks.length && toks[k] !== 'M' && toks[k] !== 'F') k++
    if (k >= toks.length) { problems.push(`${school}: leftover lines ${JSON.stringify(toks.slice(j))}`); break }
    let pre = toks.slice(j, k)
    const g = toks[k++]
    let grade: string | null = null
    if (k < toks.length && GRADE.test(toks[k])) grade = toks[k++].replace('.', '')
    if (k < toks.length && RECORD.test(toks[k])) k++
    let weight: number | null = null
    if (pre.length && /^\d+$/.test(pre[pre.length - 1])) { weight = Number(pre[pre.length - 1]); pre = pre.slice(0, -1) }
    if (pre.length === 0) noName.push(`${school}: ${[weight, g, grade].filter(Boolean).join(' ')}`)
    else if (pre.length > 1) problems.push(`${school}: can't read wrestler from ${JSON.stringify([...pre, g])}`)
    else rows.push({ school, name: pre[0], weight, gender: g, grade })
    j = k
  }
}

for (let i = 0; i < lines.length; i++) {
  const l = lines[i]
  if (l.endsWith(' Roster') && lines[i + 1]?.startsWith('Edit Team')) { flush(); school = l.slice(0, -' Roster'.length); toks = []; continue }
  if (l.startsWith('Edit Team') || HEADERS.has(l)) continue
  if (school != null) toks.push(l)
}
flush()

const schools = [...new Set(rows.map(r => r.school))]
const other = rows.filter(r => r.gender !== gender)
const noGrade = rows.filter(r => !r.grade)
console.log(`${schools.length} schools, ${rows.length} wrestlers parsed`)
if (problems.length) { console.log(`${problems.length} unreadable:`); for (const p of problems) console.log('  ' + p); throw new Error('fix the unreadable lines first') }
if (other.length > rows.length / 2) throw new Error(`${other.length} of ${rows.length} rows are gender ${other[0].gender} — wrong file for gender ${gender}?`)
if (other.length) { console.log(`${other.length} marked gender ${gender === 'F' ? 'M' : 'F'} on Track (loaded anyway):`); for (const r of other) console.log(`  ${r.school}: ${r.name}`) }
if (noName.length) { console.log(`${noName.length} with no name (left out):`); for (const r of noName) console.log('  ' + r) }
if (noGrade.length) { console.log(`${noGrade.length} with no grade (left out):`); for (const r of noGrade) console.log(`  ${r.school}: ${r.name}`) }

// Same convention as the 2026-09-15 boys load: the last word is the last name.
// The tool compares whole names, so a compound surname still matches.
const insert = rows.filter(r => r.grade).map(r => {
  const parts = r.name.split(/\s+/)
  return {
    school_name_raw: r.school,
    first_name_raw: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0],
    last_name_raw: parts.length > 1 ? parts[parts.length - 1] : '',
    weight_class: r.weight,
    grade: r.grade,
    gender,
    season_id: seasonId,
    status: 'pending',
    import_batch: batch,
  }
})
const byGrade: Record<string, number> = {}
for (const r of insert) byGrade[r.grade!] = (byGrade[r.grade!] ?? 0) + 1
console.log(`to load: ${insert.length}`, byGrade, `season ${seasonId}, gender ${gender}, batch ${batch}`)

// ── Load ─────────────────────────────────────────────────────────────────────
const existing = await db.from('roster_grade_import').select('id', { count: 'exact', head: true }).eq('season_id', seasonId).eq('gender', gender)
if (existing.error) throw new Error(`roster_grade_import: ${existing.error.message || existing.error.code || 'query failed'} (gender column added? 20261029_roster_grade_import_gender.sql)`)
if (existing.count) throw new Error(`${existing.count} rows already loaded for season ${seasonId} gender ${gender} — not loading again`)
if (!APPLY) { console.log('dry run — add --apply to insert'); process.exit(0) }

let done = 0
for (let i = 0; i < insert.length; i += 500) {
  const { error } = await db.from('roster_grade_import').insert(insert.slice(i, i + 500))
  if (error) throw new Error(`insert at row ${i}: ${error.message} (${done} inserted — delete batch '${batch}' before retrying)`)
  done += Math.min(500, insert.length - i)
}
console.log(`inserted ${done}`)
