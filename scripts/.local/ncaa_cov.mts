import { readFileSync } from 'fs'
import { COLLEGES_D1 } from '../../src/lib/ncaa/colleges'
const d = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/ncaa_schools.json', 'utf8'))
const key = (s: string) => s.toLowerCase()
const idx = new Map<string, string[]>()
for (const c of COLLEGES_D1) for (const a of [c.name, ...c.aliases]) idx.set(key(a), [...(idx.get(key(a)) ?? []), c.name])
const dup = [...idx].filter(([, v]) => new Set(v).size > 1); if (dup.length) console.log('ambiguous', dup)
const miss = [...d.full, ...d.abbr].map(([n]: [string]) => n).filter((n: string) => !idx.has(key(n)))
console.log('colleges', COLLEGES_D1.length, '| names in files', d.full.length + d.abbr.length, '| unmapped', miss)
