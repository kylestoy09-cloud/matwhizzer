// Save Super 32 2026 into the hubs with Kyle's rules (2026-11-12): NJ kids take the proposed match (the 6 HS
// wrestlers) or become new prospects; an out-of-state kid links to our wrestler only when that school's
// state matches the kid's state, never in the mixed (middle school / youth) pool; everyone else is new.
// Then middle school / youth class years from the roster grades (8th grade in 2026-27 = class of 2031).
import { readFileSync } from 'fs'
const { NextRequest } = await import('next/server')
const I = await import('../../src/app/api/admin/hub/import/route')
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const req = (body: unknown) => new NextRequest('http://l/api', { method: 'POST', body: JSON.stringify(body) })
for (const p of plan) {
  const people: Record<string, unknown> = {}
  let linked = 0, oosLinked = 0
  for (const x of p.people) {
    let choice: any = { type: 'new' }
    const s = x.suggestion
    if (s?.type === 'wrestler') {
      const w = x.wrestlers.find((w: any) => w.id === s.id)
      const st = (w?.schools ?? []).map((n: string) => n.match(/\(([A-Z]{2})\)\s*$/)?.[1] ?? 'NJ')
      if (x.state === 'NJ' && !w.is_oos) { choice = s; linked++ }
      else if (p.gender !== 'X' && x.state !== 'NJ' && w.is_oos && st.includes(x.state)) { choice = s; oosLinked++ }
    }
    people[x.key] = { choice, state: x.state, club_id: null }
  }
  const res = await I.POST(req({ gender: p.gender, event_id: p.event_id, kind: 'podium', style: 'folkstyle', text: p.text, action: 'save', people }))
  const d = await res.json()
  console.log(`${p.gender === 'X' ? 'Middle School (mixed)' : p.gender === 'F' ? 'Girls' : 'Boys'}: ${res.status} saved ${d.saved} places · new prospects ${d.prospects_created} · linked to our wrestlers ${d.prospects_linked} (NJ ${linked}, out-of-state same state ${oosLinked})${d.error ? ' ERROR ' + d.error : ''}`)
  if (p.gender === 'X') {
    // class years from the roster grades
    const grade = new Map<string, number>()
    for (const line of p.text.split('\n').slice(1)) {
      const [, , name, state, , g] = line.split(',')
      const n = parseInt(g ?? '')
      if (name && n) grade.set(`${name.trim()}|${state}`, n)
    }
    const { data: ev } = await db.from('mixed_hub_placements').select('prospect_id, name_listed').eq('event_id', p.event_id)
    const { data: pr } = await db.from('mixed_prospects').select('id, state').in('id', (ev ?? []).map(e => e.prospect_id))
    const st = new Map((pr ?? []).map(r => [r.id, r.state]))
    let set = 0
    for (const e of ev ?? []) {
      const g = grade.get(`${e.name_listed}|${st.get(e.prospect_id)}`)
      if (!g) continue
      await db.from('mixed_prospects').update({ class_year: 2027 + (12 - g) }).eq('id', e.prospect_id).is('class_year', null)
      set++
    }
    console.log(`  class years set from grades: ${set}`)
  }
}
