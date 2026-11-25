import { readFileSync, writeFileSync } from 'fs'
const L: any[] = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/links.json', 'utf8'))
// school year an event falls in (ends in June): Oct 2026 → 2027
const syEnd = (d: string | null, season: number) => { if (!d) return season; const [y, m] = d.split('-').map(Number); return m >= 7 ? y + 1 : y }
const grade = (cls: number | null, d: string | null, season: number) => (cls ? 12 - (cls - syEnd(d, season)) : null)
const flags: any[] = []
for (const o of L) {
  const season = Number(/(\d{4})$/.exec(o.event)?.[1]); const g = grade(o.class, o.date, season)
  const n = Number.parseInt(o.weight), recent = (o.date ?? '') >= '2026-03-01'
  const why: string[] = []
  if (recent && o.diff != null && o.diff <= -3) why.push(`${o.diff} classes below their 2025-26 weight`)
  if (recent && o.last_weight && n && n < (o.g === 'boys' ? 100 : 94)) why.push(`${n} lb`)
  if (/\b(14 ?U|12 ?U|11 ?U|10 ?U|8 ?U)\b/i.test(o.division ?? '') && g != null && g > 9) why.push(`youth division, grade ${g}`)
  if (/cadet/i.test(o.division ?? '') && g != null && (g < 8 || g > 10)) why.push(`Cadets, grade ${g}`)
  if (why.length) flags.push({ ...o, grade: g, why: why.join('; ') })
}
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/flags.json', JSON.stringify(flags))
console.log('flagged', flags.length, 'results of', new Set(flags.map(f => f.prospect_id)).size, 'linked kids')
for (const f of flags) console.log(`  ${f.g} ${f.wrestler} (${f.class ?? '?'}, ${f.last_weight ?? '?'}) ← ${f.event} · ${f.division} ${f.weight} · ${f.place} [${f.club ?? ''}] — ${f.why}`)
