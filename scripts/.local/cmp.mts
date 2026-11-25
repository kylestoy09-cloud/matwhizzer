import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const D = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dbpts.json', 'utf8'))
const WCW: Record<number, number> = {53:106,54:113,55:120,56:126,57:132,58:138,59:144,60:150,61:157,62:165,63:175,64:190,65:215,66:285}
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const L = fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dmd2026.txt', 'utf8').split('\n')
const tw = new Map<string, { pts: number; block: string[] }>(); let d = 0, w = 0, cur: string[] | null = null
for (const l of L) {
  const h = l.match(/^NJSIAA District (\d+) Results for/); if (h) { d = Number(h[1]); cur = null; continue }
  if (/^\d{3}$/.test(l.trim())) { w = Number(l.trim()); cur = null; continue }
  const m = l.match(/^(.+?) \(\d+-\d+\) (?:placed|place is).*?scored ([\d.]+) team points\./)
  if (m && d) { cur = []; tw.set(`${d}|${w}|${n(m[1])}`, { pts: Number(m[2]), block: cur }); continue }
  if (cur && l.trim()) cur.push(l.trim())
}
const ids = D.map((x: any) => x.e)
const names = new Map<string, string>()
for (let i = 0; i < ids.length; i += 200) for (const r of (await db.from('tournament_entries').select('id, wrestlers(first_name,last_name)').in('id', ids.slice(i, i + 200))).data as any[]) names.set(r.id, `${r.wrestlers.first_name} ${r.wrestlers.last_name}`)
let eq = 0, ne = 0; const diff: Record<string, number> = {}; const ex: string[] = []
for (const x of D) {
  const dd = Number(x.t.match(/District (\d+)$/)[1]); if (dd > 18) continue
  const k = `${dd}|${WCW[x.wc]}|${n(names.get(x.e) ?? '')}`; const t = tw.get(k); if (!t) continue
  const dv = +(t.pts - x.pts).toFixed(1); if (dv === 0) { eq++; continue } ne++; diff[dv] = (diff[dv] ?? 0) + 1
  if (ex.length < 6 && dv !== -0.5) ex.push(`D${dd} ${WCW[x.wc]} ${names.get(x.e)}: TW ${t.pts}, db-rules ${x.pts}\n     ${t.block.slice(0, 5).join('\n     ')}`)
}
console.log(`per wrestler D1-18: equal ${eq}, differ ${ne}`, JSON.stringify(diff)); console.log(ex.join('\n'))
