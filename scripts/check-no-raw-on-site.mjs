// Build check: public pages never show imported text, and never look a logo up by name
// (2026-11-02). Raw imported fields (wrestler1_name_raw, school_context_raw, ...) hold whatever
// the source file said ("Northern Valley Regional (Old Tappan) HS", "Forfeit Forfeit"); the site
// shows the wrestler's profile name and the school by id. A public file may still fetch a raw
// name only to hand it to personLabel() (src/lib/personName.ts), which turns a side with no
// profile into "Forfeit" / "Unknown". Logos are looked up by school id: a name lookup misses
// whenever the text differs from schools.display_name.
// A line that must break a rule says why with a trailing  // raw-ok: <reason>
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src/app/(site)', 'src/components']
const SKIP = [/src\/components\/admin\//]

const RAW = /\b\w+_raw\b|\bnameRaw\b/
// where a raw field may appear: a select column list, a type field, a destructure that drops it,
// or the personLabel() call that replaces it
const RAW_OK = [
  /\.select\(/,                                  // select('..., wrestler1_name_raw, ...')
  /^\s*[\w\s,]*\b\w+_raw\b[\w\s,]*,?\s*$/,      // column list line inside a select template
  /^\s*\w+_raw\??:\s/,                           // type field
  /^\s*nameRaw\??(:|,)/,                          // prop declaration
  /\(\{[^}]*\b\w+_raw\b[^}]*\.\.\.\w+\s*\}/,     // ({ x_raw, ...rest }) — dropped from the row
  /personLabel\(/,                               // replaced by the profile name / Forfeit / Unknown
  /\/\/ raw-ok:/,
]
const NAME_LOGO = /logos\.badge\(|\bbyName\.get\(|\bbgByName\.get\(|badgeByIdOrName\(/

function walk(d) {
  return readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
}

const bad = []
for (const root of ROOTS) for (const f of walk(root).filter(p => /\.tsx?$/.test(p) && !SKIP.some(r => r.test(p)))) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    const code = line.replace(/^\s*\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
    if (RAW.test(code) && !RAW_OK.some(r => r.test(code))) bad.push(`${f}:${i + 1}  raw field shown: ${line.trim().slice(0, 110)}`)
    if (NAME_LOGO.test(code) && !/\/\/ raw-ok:/.test(code)) bad.push(`${f}:${i + 1}  logo looked up by name: ${line.trim().slice(0, 110)}`)
  })
}

if (bad.length) {
  console.error(`✗ ${bad.length} public line(s) show imported text or look a logo up by name:\n  ${bad.join('\n  ')}`)
  console.error('  Use the profile name (personLabel) and the school id (SchoolTag / logos.byId); see scripts/check-no-raw-on-site.mjs')
  process.exit(1)
}
console.log('✓ Public pages show profile names and schools by id; no imported text, no logo-by-name lookups')
