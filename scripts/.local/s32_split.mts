// Super 32 2026: split the bout export into brackets (who wrestled whom), then label each bracket with the
// NJ kids in it that our database knows (gender, class year).
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const file = process.argv[2]
const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)
const cells = (l: string) => l.split('","').map(c => c.replace(/^"?=?"+|"+$/g, '').replace(/^=/, '').replace(/^"+|"+$/g, ''))
const head = cells(lines[0])
const rows = lines.slice(1).map(l => Object.fromEntries(cells(l).map((v, i) => [head[i], v])))
const par = new Map<string, string>()
const find = (x: string): string => { let p = par.get(x) ?? x; if (p === x) { par.set(x, x); return x } p = find(p); par.set(x, p); return p }
const key = (w: string, n: string, t: string) => `${w}|${n}|${t}`
for (const r of rows) { const a = key(r.Weight, r['Winning Wrestler'], r['Winning Team']); find(a); if (r['Losing Wrestler']) par.set(find(a), find(key(r.Weight, r['Losing Wrestler'], r['Losing Team']))) }
const brackets = new Map<string, any[]>()
for (const r of rows) { const k = find(key(r.Weight, r['Winning Wrestler'], r['Winning Team'])); brackets.set(k, [...(brackets.get(k) ?? []), r]) }
// our wrestlers, both sides, by name
const ws: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestlers').select('first_name, last_name, gender, graduation_year, is_oos').order('id').range(f, f + 999); ws.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const byName = new Map<string, any[]>()
for (const w of ws) { const k = `${w.first_name} ${w.last_name}`.toLowerCase(); byName.set(k, [...(byName.get(k) ?? []), w]) }
const out: any[] = []
for (const [, rs] of brackets) {
  const ppl = new Map<string, string>()
  for (const r of rs) { ppl.set(r['Winning Wrestler'], r['Winning Team']); if (r['Losing Wrestler']) ppl.set(r['Losing Wrestler'], r['Losing Team']) }
  const nj = [...ppl].filter(([, t]) => t === 'NJ').map(([n]) => n)
  let M = 0, F = 0; const years: number[] = []
  for (const n of nj) { const hit = byName.get(n.toLowerCase()) ?? []; if (hit.length === 1) { hit[0].gender === 'F' ? F++ : M++; if (hit[0].graduation_year) years.push(hit[0].graduation_year) } }
  years.sort()
  out.push({ weight: rs[0].Weight, wrestlers: ppl.size, nj: nj.length, matchedM: M, matchedF: F, classYears: years.length ? `${years[0]}–${years[years.length - 1]} (median ${years[Math.floor(years.length / 2)]})` : '', size: Math.max(0, ...rs.filter(r => r.Round.startsWith('Round of')).map(r => +r.Round.split(' ').pop())) })
}
out.sort((a, b) => (parseInt(a.weight) || 999) - (parseInt(b.weight) || 999) || b.wrestlers - a.wrestlers)
for (const o of out) console.log(`${o.weight.padStart(14)} | ${String(o.wrestlers).padStart(3)} wrestlers (bracket ${o.size}) | NJ ${String(o.nj).padStart(2)} | in our DB: boys ${o.matchedM}, girls ${o.matchedF} | class ${o.classYears}`)
