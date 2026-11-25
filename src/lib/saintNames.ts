// Saint schools (Kyle 2026-11-14): every one is named "St. …", and a search for "st", "st." or "saint" finds them all.
//   stName           the name as it's stored and shown: "Saint Rose" / "St Joseph" → "St. Rose" / "St. Joseph"
//   schoolNameMatches  in-memory search: "saint" = "st", periods ignored; a saint word matches at a word's start only
//                      ("st" finds St. Rose, not West Deptford)
//   schoolIlikeOr      the same for a database search: a PostgREST .or() on display_name

export const stName = (n: string) => n.replace(/\b(?:saint|st)\b\.?\s+/gi, 'St. ')

const key = (s: string) => s.toLowerCase().replace(/\bsaint\b/g, 'st').replace(/\./g, '').replace(/\s+/g, ' ').trim()
const hasSaint = (q: string) => /\b(?:saint|st)\b/i.test(q)

export function schoolNameMatches(name: string | null | undefined, q: string): boolean {
  const k = key(q)
  if (!k) return true
  const n = key(name ?? '')
  if (!hasSaint(q)) return n.includes(k)
  const i = n.indexOf(k)
  return i === 0 || (i > 0 && !/[a-z0-9]/.test(n[i - 1])) || n.split(/[^a-z0-9]+/).some((_, j, w) => w.slice(j).join(' ').startsWith(k))
}

/** `.or()` filter: display_name contains the text as typed, or with its saint word written "St." */
export function schoolIlikeOr(q: string, column = 'display_name') {
  const clean = q.replace(/[",()]/g, ' ').trim()
  const st = clean.replace(/\b(?:saint|st)\b\.?(\s+|$)/gi, (_m, sp: string) => (sp ? 'St. ' : 'St.'))
  // a saint word: "St. …" at the start of the name or of a word in it, never inside one (West, East)
  return st !== clean ? [`${column}.ilike."${st}%"`, `${column}.ilike."% ${st}%"`, `${column}.ilike."%-${st}%"`].join(',') : `${column}.ilike."%${clean}%"`
}
