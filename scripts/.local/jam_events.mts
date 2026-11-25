// Extract event titles + bout lines from the girls "Other" raw files
import { execSync } from 'child_process'
import fs from 'fs'
const dir = '../Whizzer Upload/2025-26 Girls Data/'
const files = ['Other Girls Matches - 2025-26.rtf','January Girls - Other 1-15.rtf','2025-26 - Grils February Other.rtf','Jack Welch - 2026.rtf']
const out: any[] = []
for (const f of files) {
  const txt = execSync(`textutil -convert txt -stdout "${dir}${f}"`, { maxBuffer: 1e9 }).toString().replace(/ /g,' ')
  const lines = txt.split('\n')
  let title = ''
  let round = ''
  const ev = new Map<string, { file: string; title: string; bouts: Set<string>; dates: Set<string> }>()
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    if (/^•?\s*Teams\s+Divisions\s+Weights/.test(l.replace(/^\s*•\s*/,'')) && i > 0) {
      let j = i - 1; while (j >= 0 && (!lines[j].trim() || /^\s*•\s*$/.test(lines[j]))) j--
      const t = lines[j].trim().replace(/^•\s*/, '')
      if (t && !/Click here/.test(t)) title = t
      continue
    }
    if (/ over /.test(l)) {
      const base = title.replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}$/, '').trim()
      const e = ev.get(base) ?? ev.set(base, { file: f, title: base, bouts: new Set(), dates: new Set() }).get(base)!
      const dm = title.match(/(\d{1,2}\/\d{1,2}\/\d{4})$/); if (dm) e.dates.add(dm[1])
      const body = l.replace(/\s+/g,' ').replace(/^[^()]{0,60}? - (?=.* over )/, '')
      const m = body.match(/^(.+?) \(((?:[^()]|\([^()]*\))+)\) over (.+?) \(((?:[^()]|\([^()]*\))+)\) \((.+)\)$/)
      const w = m ? null : body.match(/^(.+?) \(([^()]+)\) won by [a-z ]+ over (.+?) \(([^()]+)\) (.+)$/)
      if (!m && !w) { console.error('NOPARSE', f, body); continue }
      if (w) { e.bouts.add(JSON.stringify([w[1].trim(), w[2].trim(), w[3].trim(), w[4].trim(), w[5].trim()])); continue }
      if (!m) continue
      e.bouts.add(JSON.stringify([m[1].trim(), m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()]))
    }
  }
  for (const e of ev.values()) out.push({ file: e.file, title: e.title, dates: [...e.dates], bouts: [...e.bouts] })
}
for (const e of out) console.log(`${e.file}\t${e.title}\t${e.dates.join(',')}\t${e.bouts.length}`)
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/jam_events.json', JSON.stringify(out))
