// Super 32 2026: create the three events (boys + girls Offseason 2026, mixed Middle School 2026-27) and run
// each podium through the hub import's matching step. Prints every NJ kid's proposed match; saves nothing.
import { readFileSync, writeFileSync } from 'fs'
const { NextRequest } = await import('next/server')
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const E = await import('../../src/app/api/admin/hub/events/route')
const I = await import('../../src/app/api/admin/hub/import/route')
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/Super 32 2026 podiums`
const read = (d: string) => readFileSync(`${dir}/Super 32 2026 podium - ${d}.csv`, 'utf8')
const req = (url: string, body?: unknown, method = 'POST') => new NextRequest(`http://l${url}`, body ? { method, body: JSON.stringify(body) } : undefined)
const plan = [
  { gender: 'M', hub: 'offseason', name: 'Super 32 Challenge', season: 2026, text: read('High School Boys') },
  { gender: 'F', hub: 'offseason', name: 'Super 32 Challenge', season: 2026, text: read('High School Girls') },
  { gender: 'X', hub: 'ms', name: 'Super 32 Challenge (MS Division)', season: 2027, text: [read('Middle School'), read('11U').split('\n').slice(1).join('\n'), read('8U').split('\n').slice(1).join('\n')].join('\n') },
]
const saved: any[] = []
for (const p of plan) {
  const ts = await (await T.GET(req(`/api?gender=${p.gender}&hub=${p.hub}`, undefined, 'GET'))).json()
  const t = ts.tournaments.find((x: any) => x.name === p.name)
  if (!t) throw new Error(`no ${p.name} on ${p.gender}`)
  let ev = t.events.find((e: any) => e.season === p.season)
  if (!ev) ev = (await (await E.POST(req('/api', { gender: p.gender, tournament_id: t.id, season: p.season, start_date: '2026-10-24' }))).json()).event
  const pv = await (await I.POST(req('/api', { gender: p.gender, event_id: ev.id, kind: 'podium', style: 'folkstyle', text: p.text }))).json()
  if (pv.error) throw new Error(pv.error)
  console.log(`\n=== ${p.gender === 'X' ? 'Middle School (mixed)' : p.gender === 'F' ? 'Girls' : 'Boys'} · ${p.name} · event ${ev.id}: ${pv.rows.length} places, ${pv.people.length} kids, ${pv.skipped.length} lines skipped, clashes ${pv.clashes.length}`)
  const nj = pv.people.filter((x: any) => x.state === 'NJ')
  for (const x of nj) {
    const s = x.suggestion
    const what = !s ? `CHOOSE: ${x.wrestlers.map((w: any) => `${w.name} (${w.class_year ?? '?'}, ${w.schools.join('/') || 'no school'})`).concat(x.prospects.map((q: any) => `prospect ${q.name}`)).join(' | ')}`
      : s.type === 'wrestler' ? (() => { const w = x.wrestlers.find((w: any) => w.id === s.id); return `HS wrestler ${w.name}, class of ${w.class_year ?? '?'}, ${w.schools.join('/') || 'no school on file'}` })()
      : s.type === 'prospect' ? 'existing prospect' : 'new prospect'
    console.log(`  ${x.name.padEnd(24)} → ${what}`)
  }
  const others = pv.people.filter((x: any) => x.state !== 'NJ')
  console.log(`  other states: ${others.length} kids → ${others.filter((x: any) => x.suggestion?.type === 'new').length} new prospects, ${others.filter((x: any) => x.suggestion?.type !== 'new').length} with a possible match`)
  saved.push({ ...p, event_id: ev.id, people: pv.people })
}
writeFileSync(process.argv[2], JSON.stringify(saved))
