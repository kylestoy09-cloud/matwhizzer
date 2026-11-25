import { readFileSync } from 'fs'
const { NextRequest } = await import('next/server')
const I = await import('../../src/app/api/admin/hub/import/route')
const H = await import('../../src/lib/hubFiles')
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const roster = H.parseRoster(H.rtfToText(readFileSync(`${B}/Super 32 Roster.rtf`, 'utf8'))), idx = H.rosterIndex(roster)
const lines = ['Weight,Place,Name,Club,State,Division,Style,Class']
for (const b of H.bracketsFrom(H.parseBoutExport(readFileSync(`${B}/2026DefenseSoapSuper32Challenge.csv`, 'utf8'))).filter(H.contested)) {
  const { division, grades } = H.divisionOf(b, idx)
  if (division !== 'High School Boys') continue
  for (const p of H.placesFrom(b)) lines.push([b.weight, p.place_to ? `${p.place}-${p.place_to}` : p.place, p.person.name, '', p.person.team, division, 'folkstyle', H.classYear(grades.get(`${p.person.name}|${p.person.team}`) ?? null, '2026-10-24') ?? ''].join(','))
}
const res = await I.POST(new NextRequest('http://l/api', { method: 'POST', body: JSON.stringify({ gender: 'M', event_id: 2, kind: 'podium', style: 'folkstyle', text: lines.join('\n') }) }))
const d = await res.json()
const keys = new Map<string, number>(); for (const l of lines.slice(1)) { const [w, pl, n] = l.split(','); const kk = pl.includes('-') ? `${w}|${pl}|${n}` : `${w}|${pl}`; keys.set(kk, (keys.get(kk) ?? 0) + 1) }
for (const l of lines) if (l.split(',').length !== 8) console.log('odd row:', l)
console.log('rows sharing a key:', [...keys].filter(([, v]) => v > 1))
console.log('rows', lines.length - 1, '| read', d.rows?.length, '| skipped', d.skipped?.length, '| already loaded (refused)', d.clashes?.length, '| e.g.', d.clashes?.slice(0, 2))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const have: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('boys_hub_placements').select('weight, place, place_to, name_listed').eq('event_id', 2).order('id').range(f, f + 999); have.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const k = (w: string, p: number, t: number | null, n: string) => `${w}|${p}|${t ?? ''}|${n.toLowerCase()}`
const hk = new Set(have.map(h => k(h.weight, h.place, h.place_to, h.name_listed)))
for (const l of lines.slice(1)) { const [w, pl, n] = l.split(','); const [a, z] = pl.split('-').map(Number); if (!hk.has(k(w, a, z || null, n))) console.log('new or moved:', l, '| loaded as:', have.filter(h => h.name_listed === n && h.weight === w).map(h => `${h.place}${h.place_to ? '-' + h.place_to : ''}`)) }
const { parsePodiums } = await import('../../src/lib/hub')
const parsed = parsePodiums(lines.join('\n')).rows
const dk = (div: string | null, w: string, p: number, t: number | null, n: string) => `${(div ?? '').toLowerCase()}|${w.toLowerCase()}|${p}${t ? `|${n.toLowerCase()}` : ''}`
const { data: hv } = await db.from('boys_hub_placements').select('division, weight, place, place_to, name_listed, style').eq('event_id', 2).limit(5000)
const tk = new Set((hv ?? []).map((r: any) => `${r.style}|${dk(r.division, r.weight, r.place, r.place_to, r.name_listed)}`))
for (const r of parsed) { const kk = `${r.style ?? 'folkstyle'}|${dk(r.division, r.weight, r.place, r.place_to, r.name)}`; if (!tk.has(kk)) console.log('NOT TAKEN', kk, JSON.stringify(r)) }
console.log('db rows', hv?.length)
