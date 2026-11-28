// TrackWrestling team roster pages ("Edit Team → Roster"), one school after another, saved as RTF or copied as text
// (preseason step 3, Kyle 2026-11-28). Read with rtfToText, each school starts with "<School> Roster"; each
// wrestler is one row, cells split by tabs (empty cells stay in place):
//   Name | Eligible | Wt. Class | Gender | Grade | Record      e.g. "Ashawn Bell", "", "", "F", "So.", "0-0"

export type TrackRosterRow = { name: string; eligible: string; weight: number | null; gender: string; grade: string | null; record: string }
export type TrackRoster = { team: string; rows: TrackRosterRow[] }

const GRADE = /^(Fr|So|Jr|Sr)\.?$/i
const cap = (g: string) => g[0].toUpperCase() + g[1].toLowerCase()

export function readTrackRosters(text: string): TrackRoster[] {
  const out: TrackRoster[] = []
  let cur: TrackRoster | null = null
  for (const line of text.split(/\r?\n/)) {
    const head = /^\s*(.+?)\s+Roster\s*$/.exec(line)
    if (head && !line.includes('\t')) { cur = { team: head[1].trim(), rows: [] }; out.push(cur); continue }
    if (!cur) continue
    const cells = line.split('\t').map(c => c.trim())
    while (cells.length && cells[0] === '') cells.shift()
    if (cells.length < 6 || cells[0] === 'Name') continue
    const [name, eligible, wt, gender, grade, record] = cells
    if (!name || !/^[MF]$/.test(gender)) continue
    cur.rows.push({ name: name.replace(/\s+/g, ' '), eligible, weight: /^\d+$/.test(wt) ? Number(wt) : null, gender, grade: GRADE.test(grade) ? cap(grade.replace('.', '')) : null, record })
  }
  return out.filter(r => r.rows.length)
}

/** a person's name for matching: case, punctuation, suffixes (Jr, III) and extra spaces dropped */
export function personKey(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[.'’`]/g, '').replace(/[-,]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ').replace(/\s+/g, ' ').trim()
}

/** first and last of a key ("de la cruz" stays one last name when the rest is one word) */
export const splitKey = (k: string) => { const p = k.split(' '); return { first: p[0] ?? '', last: p.slice(1).join(' ') } }

/** edit distance, capped (stops counting at cap + 1) */
export function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]) }
    if (best > cap) return cap + 1
    prev = cur
  }
  return prev[b.length]
}

/** the same person spelled a little differently: same last name and a first name that starts the same (Mike /
 *  Michael, Nick / Nicholas), the same first name with the last name a few letters off, or the whole name 1–2 letters off */
export function closeName(a: string, b: string): boolean {
  if (a === b) return false
  const x = splitKey(a), y = splitKey(b)
  if (x.last && x.last === y.last && x.first.slice(0, 3) === y.first.slice(0, 3)) return true
  // same first name, the last name misspelled (Glasgow / Glagsowb)
  if (x.first && x.first === y.first && x.last.slice(0, 3) === y.last.slice(0, 3) && editDistance(x.last, y.last, 3) <= 3) return true
  return editDistance(a, b, 2) <= 2
}
