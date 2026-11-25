import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/History/2013`
const cell = (s: string) => s.replace(/^="?|"$/g, '').replace(/^"|"$/g, '')
const rows: Record<string, string>[] = []
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.csv'))) {
  const lines = fs.readFileSync(`${dir}/${f}`, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
  const parse = (l: string) => [...l.matchAll(/"((?:[^"]|"")*)"/g)].map(m => cell(m[1].replace(/""/g, '"')))
  const head = parse(lines[0])
  for (const l of lines.slice(1)) { const c = parse(l); rows.push({ file: f, ...Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])) }) }
}
const kind = (f: string) => /State/.test(f) ? 'state' : /Region/.test(f) ? 'region' : 'district'
const by = (k: string, f: (r: Record<string, string>) => string) => { const m: Record<string, number> = {}; for (const r of rows) { const x = f(r); m[x] = (m[x] ?? 0) + 1 } console.log(k, m) }
console.log('rows', rows.length)
by('rounds', r => `${kind(r.file)}: ${r.Round}`)
by('win types', r => r['Win Type'])
by('weights', r => r.Weight)
by('dates', r => `${kind(r.file)} ${r.Date}`)
// teams → our schools
const teams = new Set(rows.flatMap(r => [r['Winning Team'], r['Losing Team']]).filter(Boolean))
const { data: sch } = await db.from('schools').select('id, display_name')
const al: { school_id: number; alias: string }[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('school_aliases').select('school_id, alias').order('id').range(f, f + 999); al.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const exact = new Map<string, Set<number>>()
const add = (k: string, id: number) => (exact.get(k.toLowerCase().trim()) ?? exact.set(k.toLowerCase().trim(), new Set()).get(k.toLowerCase().trim())!).add(id)
for (const s of sch ?? []) add(s.display_name, s.id); for (const a of al) add(a.alias, a.school_id)
const unmatched = [...teams].filter(t => exact.get(t.toLowerCase().trim())?.size !== 1)
console.log('teams', teams.size, '| exact school match', teams.size - unmatched.length, '| not matched', unmatched.length, unmatched.sort().join('; '))
// wrestlers: distinct name+team
const people = new Set(rows.flatMap(r => [`${r['Winning Wrestler']}|${r['Winning Team']}`, `${r['Losing Wrestler']}|${r['Losing Team']}`]).filter(x => x !== '|'))
console.log('distinct wrestler+team', people.size)
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/h2013.json', JSON.stringify(rows))
