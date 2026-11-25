// NHSCA National Duals 2026 (May 23-25), Kyle's copy of the duals page (Kyle 2026-11-13). Bouts only — duals have no
// places — for head-to-head results on the hub leaderboard. Read with parseDualCopy (src/lib/hubFiles.ts); kids
// matched like every hub import (the import route's preview: exact names, NJ kid → NJ wrestler, the weight / youth
// guard), plus the roster's grade: a link to one of our wrestlers needs the class year within a year. Forfeits are
// left out. DIVISION=HSB (default) | HSG | MS | EL picks the division (and so the pool). Usage: [go]
import { readFileSync, writeFileSync } from 'fs'
import { NextRequest } from 'next/server'
import * as H from '../src/lib/hubFiles'
const T = await import('../src/app/api/admin/hub/tournaments/route')
const E = await import('../src/app/api/admin/hub/events/route')
const I = await import('../src/app/api/admin/hub/import/route')
const req = (url: string, body?: unknown, method = 'POST') => new NextRequest(`http://l${url}`, body ? { method, body: JSON.stringify(body) } : undefined)
// EVENT=nhsca (default) | aau — AAU Scholastic Duals (June 24-29, 2026), "Disney Duals"
const EVENTS: Record<string, { file: string; date: string; boys: string; ms: string }> = {
  nhsca: { file: '2026 NHSCA National Duals.rtf', date: '2026-05-23', boys: 'NHSCA National Duals', ms: 'NHSCA National Duals (MS Division)' },
  aau: { file: '2026 AAU Scholastic Duals Boys:Girls.rtfd/TXT.rtf', date: '2026-06-24', boys: 'AAU Scholastic Duals (Disney Duals)', ms: 'AAU Scholastic Duals (Disney Duals)' },
}
const EV = EVENTS[process.env.EVENT ?? 'nhsca']
const FILE = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/${EV.file}`, DATE = EV.date
const DIV = process.env.DIVISION ?? 'HSB'
const SETUP: Record<string, { gender: 'M' | 'F' | 'X'; hub: 'offseason' | 'ms'; tournament: string; season: number }> = {
  HSB: { gender: 'M', hub: 'offseason', tournament: EV.boys, season: 2026 },
  HSG: { gender: 'F', hub: 'offseason', tournament: EV.boys, season: 2026 },
  MS: { gender: 'X', hub: 'ms', tournament: EV.ms, season: 2026 },   // May 2026 = 2025-26
  EL: { gender: 'X', hub: 'ms', tournament: EV.ms, season: 2026 },
}
const S = SETUP[DIV]
const text = H.rtfToText(readFileSync(FILE, 'utf8'))
const { bouts, unresolved } = H.parseDualCopy(text)
const roster = H.parseRoster(text), grade = new Map<string, number | null>()
for (const r of roster) grade.set(`${r.first} ${r.last}|${r.team.toLowerCase()}`, r.grade)
const club = (t: string) => t.replace(/\s+-\s+(HSB|HSG|MS|EL)$/, '').trim()
const csv = (v: string) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const lines = ['Weight,Winning Wrestler,Winning Team,Losing Wrestler,Losing Team,Win Type,Result,Division', ...bouts.filter(b => b.division === H.DUAL_DIVISIONS[DIV]).map(b => [b.weight, b.winner, club(b.winTeam), b.loser, club(b.loseTeam), b.winType, b.result, b.division].map(csv).join(','))]
const ts = (await (await T.GET(req(`/api?gender=${S.gender}&hub=${S.hub}`, undefined, 'GET'))).json()).tournaments
const t = ts.find((x: any) => x.name === S.tournament); if (!t) throw new Error('no tournament')
let ev = t.events.find((e: any) => e.season === S.season)
if (!ev) ev = (await (await E.POST(req('/api', { gender: S.gender, tournament_id: t.id, season: S.season, start_date: DATE }))).json()).event
const pv = await (await I.POST(req('/api', { gender: S.gender, event_id: ev.id, kind: 'bouts', style: 'folkstyle', text: lines.join('\n') }))).json()
if (pv.error) throw new Error(pv.error)
const classOf = (name: string, team: string) => { const g = grade.get(`${name}|${team.toLowerCase()}`); return g == null ? null : H.classYear(g, DATE) }
const teamOf = new Map(bouts.flatMap(b => [[`${b.winner}|${club(b.winTeam)}`, b.winTeam], [`${b.loser}|${club(b.loseTeam)}`, b.loseTeam]]))
// a name match stands when the team has 2+ such matches (a New Jersey team) or carries the wrestler's school in its
// name ("North Hunterdon"); a lone match on any other team (VA26 Elite's Cole Wilson → our Manchester Township
// Cole Wilson) is another kid
const teamHits = new Map<string, number>()
for (const x of pv.people) if (x.suggestion?.type === 'wrestler') teamHits.set(x.club_listed, (teamHits.get(x.club_listed) ?? 0) + 1)
const people: Record<string, unknown> = {}
let hs = 0, prospect = 0, nw = 0, held = 0, lone = 0
const loneList: string[] = []
const links: string[] = []
for (const x of pv.people) {
  let choice: any = { type: 'new' }
  const s = x.suggestion
  if (s?.type === 'prospect') { choice = s; prospect++ }
  else if (s?.type === 'wrestler') {
    const w = x.wrestlers.find((w: any) => w.id === s.id)
    const cy = classOf(x.name, teamOf.get(`${x.name}|${x.club_listed}`) ?? '')
    if (cy && w.class_year && Math.abs(cy - w.class_year) > 1) held++
    else if ((teamHits.get(x.club_listed) ?? 0) < 2 && !w.schools.some((sc: string) => (x.club_listed ?? '').toLowerCase().includes(sc.toLowerCase()))) { lone++; loneList.push(`${x.name} [${x.club_listed}] ≠ ${w.name} ${w.schools.join('/')}`) }
    else { choice = s; hs++; links.push(`${x.name} [${x.club_listed}] → ${w.name} ${w.class_year ?? ''} ${w.schools.join('/')}`) }
  } else nw++
  people[x.key] = { choice, state: x.state, club_id: x.club?.id ?? null }
}
writeFileSync('scripts/.local/duals_links.txt', links.join('\n'))
console.log(loneList.join('\n'))
console.log(`bouts ${pv.rows.length} | kids ${pv.people.length}: linked to our wrestlers ${hs}, existing prospects ${prospect}, new ${nw}, held (class differs) ${held}, lone match on a non-NJ team ${lone} | names not on the roster ${unresolved.length}`)
if (process.argv[2] === 'go') {
  const res = await I.POST(req('/api', { gender: S.gender, event_id: ev.id, kind: 'bouts', style: 'folkstyle', text: lines.join('\n'), action: 'save', people, upload: { files: [EV.file.split('/')[0]], divisions: [] } }))
  const out = await res.json(); console.log('SAVED', res.status, out.saved, 'bouts · new prospects', out.prospects_created, '· linked', out.prospects_linked, out.error ?? '')
}
