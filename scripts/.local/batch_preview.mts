// Preview hub imports (no saving): tournament / season / event, file(s), side or mixed pool, style.
import { readFileSync, writeFileSync } from 'fs'
const { NextRequest } = await import('next/server')
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const E = await import('../../src/app/api/admin/hub/events/route')
const I = await import('../../src/app/api/admin/hub/import/route')
const base = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
const req = (url: string, body?: unknown, method = 'POST') => new NextRequest(`http://l${url}`, body ? { method, body: JSON.stringify(body) } : undefined)
const join = (files: string[]) => files.map((f, i) => { const t = readFileSync(`${base}/${f}`, 'utf8').trim(); return i ? t.split('\n').slice(1).join('\n') : t }).join('\n')
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const out: any[] = []
for (const p of plan) {
  const ts = await (await T.GET(req(`/api?gender=${p.gender}&hub=${p.hub}`, undefined, 'GET'))).json()
  const t = ts.tournaments.find((x: any) => x.name === p.name)
  if (!t) throw new Error(`no ${p.name}`)
  let ev = t.events.find((e: any) => e.season === p.season)
  if (!ev) ev = (await (await E.POST(req('/api', { gender: p.gender, tournament_id: t.id, season: p.season, start_date: p.date }))).json()).event
  const text = join(p.files)
  const pv = await (await I.POST(req('/api', { gender: p.gender, event_id: ev.id, kind: 'podium', style: p.style, text }))).json()
  if (pv.error) throw new Error(`${p.label}: ${pv.error}`)
  const nj = pv.people.filter((x: any) => x.state === 'NJ')
  const tally = (xs: any[]) => ({ hs: xs.filter(x => x.suggestion?.type === 'wrestler').length, prospect: xs.filter(x => x.suggestion?.type === 'prospect').length, new: xs.filter(x => x.suggestion?.type === 'new').length, choose: xs.filter(x => !x.suggestion).length })
  console.log(`\n=== ${p.label}: ${pv.rows.length} places, ${pv.people.length} kids, skipped ${pv.skipped.length}, clashes ${pv.clashes.length}${pv.clashes.length ? ' e.g. ' + pv.clashes.slice(0, 2).join('; ') : ''}`)
  console.log(`  NJ ${nj.length}: ${JSON.stringify(tally(nj))}`)
  for (const x of nj.filter((x: any) => !x.suggestion)) console.log(`   CHOOSE ${x.name}: ${[...x.wrestlers.map((w: any) => `HS ${w.name} ${w.class_year ?? '?'} ${w.schools.join('/')}`), ...x.prospects.map((q: any) => `prospect ${q.name} ${q.class_year ?? ''}`)].join(' | ')}`)
  out.push({ ...p, event_id: ev.id, text, people: pv.people })
}
writeFileSync(process.argv[3], JSON.stringify(out))
