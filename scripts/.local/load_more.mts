// Load the rest of the 2026 offseason files into the hubs (Kyle 2026-11-12: "run the upload for the additional
// tournaments"). Same reading as the upload page (build_podiums.mts), then the import route's preview and save.
// Usage: load_more.mts dry|save [label,label]
import { writeFileSync } from 'fs'
import { NextRequest } from 'next/server'
import { load, rowsOf, divisions, csvOf } from './build_podiums.mts'
import { hubSeasonOfDate } from '../../src/lib/hub'
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const E = await import('../../src/app/api/admin/hub/events/route')
const I = await import('../../src/app/api/admin/hub/import/route')
const req = (url: string, body?: unknown, method = 'POST') => new NextRequest(`http://l${url}`, body ? { method, body: JSON.stringify(body) } : undefined)
const mode = process.argv[2], only = process.argv[3]?.split(',')

import { PLANS, type Dest, type Plan } from './hub_plans.mts'

const genderOf = { M: 'M', F: 'F', X: 'X' } as const
// two possible matches, picked where the listed team names the school: "listed name|club" → school
const PICKS: Record<string, string> = { 'Anthony Russo|RBC': 'Red Bank Catholic', 'Aiden Gonzalez|North Brunswick Township': 'North Brunswick', 'Matthew Miller|Bloomfield': 'Bloomfield' }
const report: string[] = []
for (const p of PLANS.filter(p => !only || only.includes(p.label))) {
  const files = await load(p.files)
  const bad = files.filter(f => f.kind === 'unknown'); if (bad.length) throw new Error(`${p.label}: not recognized ${bad.map(f => f.name)}`)
  const leftOut: string[] = []
  let gradeOf: ((name: string, division: string) => number | null) | null = null
  // grades for a placements copy, from the event's roster (14U kids in 8th grade or below go to the Middle School Hub)
  if (p.gradesFrom) {
    const { parseRoster, rosterIndex, rtfToText } = await import('../../src/lib/hubFiles')
    const { readFileSync } = await import('fs')
    const idx = rosterIndex(parseRoster(rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/${p.gradesFrom}`, 'utf8'))))
    gradeOf = (name: string, division: string) => (idx.get(name.toLowerCase()) ?? []).find(h => h.division === division)?.grade ?? (idx.get(name.toLowerCase()) ?? [])[0]?.grade ?? null
  }
  // ONLY="division|weight,…" or "division,…": reload just those (a correction)
  const only = process.env.ONLY?.split(',')
  const rows = rowsOf(files, leftOut).filter(r => !only || only.includes(r.division) || only.includes(`${r.division}|${r.weight}`))
  for (const r of rows) if (r.grade == null && gradeOf) r.grade = gradeOf(r.name, r.division)
  // a state written into the club ("Dragon RTC - Eatontown, NJ")
  for (const r of rows) if (!r.state) { const m = /(?:,\s*|\()([A-Z]{2})\)?\s*$/.exec(r.team); if (m) r.state = m[1] }
  const unplanned = [...new Set(rows.map(r => r.division))].filter(d => !(d in p.dest)); if (unplanned.length) throw new Error(`${p.label}: no destination for ${unplanned}`)
  // each row's pool: a 14U / 16U kid with a roster grade of 8th or below goes to the Middle School Hub
  const poolOf = (r: { division: string; grade: number | null }) => { const d = p.dest[r.division]; return d === 'HS-M' || d === 'HS-F' ? (r.grade != null && r.grade <= 8 ? 'X' : d.slice(3)) : d }
  for (const r of rows) (r as any).pool = poolOf(r)
  const divsIn = (pool: string) => divisions(rows.filter(r => (r as any).pool === pool))
  console.log(`\n=== ${p.label} (${files.length} files, ${rows.length} places)`)
  for (const pool of ['M', 'F', 'X'] as const) {
    const poolRows = rows.filter(r => (r as any).pool === pool)
    const mine = divsIn(pool)
    if (!mine.length) continue
    const g = genderOf[pool], hub = pool === 'X' ? 'ms' : 'offseason'
    const season = p.date ? hubSeasonOfDate(hub, p.date) : 2026
    let ts = (await (await T.GET(req(`/api?gender=${g}&hub=${hub}`, undefined, 'GET'))).json()).tournaments
    let t = ts.find((x: any) => x.name === p.tournaments[pool])
    if (!t && pool === 'X' && p.newMixed?.name === p.tournaments.X) {
      { const r = await (await T.POST(req('/api', { gender: 'X', hub: 'ms', format: 'Individual', ...p.newMixed }))).json(); if (r.error) throw new Error(r.error); t = r.tournament }
    }
    if (!t) throw new Error(`${p.label}: no tournament ${p.tournaments[pool]} on ${g}`)
    for (const style of ['folkstyle', 'freestyle']) {
      const keep = mine.filter(d => d.style === style).map(d => ({ d: d.d, style }))
      if (!keep.length) continue
      let ev = t.events.find((e: any) => e.season === season)
      if (!ev) { const r = await (await E.POST(req('/api', { gender: g, tournament_id: t.id, season, start_date: p.date }))).json(); if (r.error) throw new Error(r.error); ev = r.event; t.events.push(ev) }
      const text = csvOf(poolRows, keep, p.date ?? '2026-09-15')
      const classOf = new Map(poolRows.filter(r => keep.some(k => k.d === r.division)).map(r => [r.name, r.grade]))
      const head = `  ${g} ${p.tournaments[pool]} ${season} ${style}: ${keep.map(k => k.d).join(', ')}`
      if (!ev) { console.log(`${head} — event not entered yet (dry run)`); continue }
      const pv = await (await I.POST(req('/api', { gender: g, event_id: ev.id, kind: 'podium', style, text }))).json()
      if (pv.error) throw new Error(`${p.label}: ${pv.error}`)
      // Choices: as the upload page proposes, with a guard on name-only links (no state given): the grade the
      // roster gives must agree with the wrestler's class year
      const people: Record<string, unknown> = {}
      let hs = 0, prospect = 0, nw = 0, held = 0, choose = 0
      const nameOnly: string[] = [], toChoose: string[] = []
      for (const x of pv.people) {
        let choice: any = { type: 'new' }
        const s = x.suggestion
        if (s?.type === 'prospect') { choice = s; prospect++ }
        else if (s?.type === 'wrestler') {
          const w = x.wrestlers.find((w: any) => w.id === s.id)
          const grade = classOf.get(x.name)
          const cy = grade != null ? (await import('../../src/lib/hubFiles')).classYear(grade, p.date ?? '2026-09-15') : null
          const st = (w.schools ?? []).map((n: string) => n.match(/\(([A-Z]{2})\)\s*$/)?.[1] ?? 'NJ')
          if (cy && w.class_year && Math.abs(cy - w.class_year) > 1) {   // one year off = a grade given for last year; two or more = another kid
            held++; toChoose.push(`${x.name} (${x.club_listed ?? x.state ?? ''}, class ${cy}) ≠ ${w.name} ${w.class_year} ${w.schools.join('/')}`) }
          else if (!x.state || x.state === 'NJ' ? !w.is_oos : w.is_oos && st.includes(x.state)) {
            choice = s; hs++
            if (!rows.find(r => r.name === x.name)?.state) nameOnly.push(`${x.name} [${x.club_listed ?? ''}] → ${w.name} ${w.class_year ?? ''} ${w.schools.join('/')}`)
          }
        } else if (!s && PICKS[`${x.name}|${x.club_listed}`]) {
          const w = x.wrestlers.filter((w: any) => w.schools.includes(PICKS[`${x.name}|${x.club_listed}`]))
          if (w.length !== 1) throw new Error(`pick not found: ${x.name}`)
          choice = { type: 'wrestler', id: w[0].id }; hs++
        } else if (!s) { choose++; toChoose.push(`${x.name} (${x.club_listed ?? x.state ?? ''}): ${[...x.wrestlers.map((w: any) => `${w.name} ${w.class_year ?? '?'} ${w.schools.join('/')}`), ...x.prospects.map((q: any) => `prospect ${q.name} ${q.state ?? ''}`)].join(' | ')}`) }
        else nw++
        people[x.key] = { choice, state: x.state, club_id: x.club?.id ?? null }
      }
      const njKids = pv.people.filter((x: any) => x.state === 'NJ').length
      console.log(`${head}\n     ${pv.rows.length} places, ${pv.people.length} kids (NJ known ${njKids}) | clashes ${pv.clashes.length} | HS links ${hs} (by name only ${nameOnly.length}), existing prospects ${prospect}, new ${nw}, two-way choices ${choose}, held (class differs) ${held}`)
      report.push(`## ${p.label} · ${g} · ${style}`, ...nameOnly.map(s => `  link ${s}`), ...toChoose.map(s => `  CHOOSE/HELD ${s}`))
      if (mode === 'save') {
        const d = { files: files.map(f => f.name), divisions: mine.filter(x => keep.some(k => k.d === x.d)).map(x => ({ division: x.d, style, weights: x.weights, places: x.places, placed_through: x.deepest })) }
        const res = await I.POST(req('/api', { gender: g, event_id: ev.id, kind: 'podium', style, text, action: 'save', people, upload: d }))
        const out = await res.json()
        if (leftOut.length) await E.PATCH(req('/api', { gender: g, id: ev.id, notes: `Not placed (the results file joins draws that can't be told apart): ${leftOut.join(', ')}` }, 'PATCH'))
        console.log(`     SAVED ${res.status} ${out.saved ?? 0} places · new prospects ${out.prospects_created} · linked ${out.prospects_linked}${out.error ? ' ERROR ' + out.error : ''}`)
      }
    }
  }
}
writeFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/matwhizzer/scripts/.local/load_more_${mode}.txt`, report.join('\n'))
