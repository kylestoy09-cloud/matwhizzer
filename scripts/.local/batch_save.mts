// Save previewed hub imports with Kyle's decisions: NJ kids take the proposed match or Kyle's pick
// (overrides: listed name → our wrestler, by name + school); no-match NJ kids are new prospects;
// out-of-state kids link only when the school's state matches (never in the mixed pool).
import { readFileSync } from 'fs'
const { NextRequest } = await import('next/server')
const I = await import('../../src/app/api/admin/hub/import/route')
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const only = process.argv[3] ? process.argv[3].split(',') : null
const OVERRIDES: Record<string, [string, string, string, string]> = {   // listed → [gender, first, last, school]
  'Christian Ramirez': ['M', 'Christian', 'Ramirez', "St. Peter's Prep"], 'Matthew Mulligan': ['M', 'Matthew', 'Mulligan', 'Bergen Catholic'],
  'Alexander Spagnuolo': ['M', 'Alex', 'Spagnuolo', 'Hanover Park'], 'J. Mako Vezzosi': ['M', 'Joseph', 'Vezzosi', ''], 'William Cruz': ['M', 'Will', 'Cruz', 'Paulsboro'],
  'Chris Wolf': ['M', 'Christian', 'Wolf', 'Parsippany Hills'], 'Terrence James Fearon': ['M', 'Terrance', 'Fearon', 'Hunterdon Central'], 'Bobby Duffy': ['M', 'Robert', 'Duffy', 'Christian Brothers'],
  'Ellie Kisselbach': ['F', 'Elllie', 'Kisselbach', 'Phillipsburg'],
}
async function override(name: string): Promise<string | null> {
  const o = OVERRIDES[name]; if (!o) return null
  const { data } = await db.from('wrestlers').select('id').eq('gender', o[0]).eq('first_name', o[1]).eq('last_name', o[2]).eq('is_oos', false)
  if (!data?.length) throw new Error(`override not found: ${name}`)
  if (data.length === 1) return data[0].id
  for (const w of data) { const { data: a } = await db.from('wrestler_name_aliases').select('schools(display_name)').eq('wrestler_id', w.id); if ((a ?? []).some((x: any) => x.schools?.display_name === o[3])) return w.id }
  throw new Error(`override ambiguous: ${name}`)
}
const req = (body: unknown) => new NextRequest('http://l/api', { method: 'POST', body: JSON.stringify(body) })
for (const p of plan) {
  if (only && !only.includes(p.label)) continue
  // fresh preview: earlier saves in this run may have created prospects these kids should reuse
  const pv = await (await I.POST(req({ gender: p.gender, event_id: p.event_id, kind: 'podium', style: p.style, text: p.text }))).json()
  if (pv.error) throw new Error(pv.error)
  const people: Record<string, unknown> = {}
  let nj = 0, picked = 0, oos = 0
  for (const x of pv.people) {
    let choice: any = { type: 'new' }
    const s = x.suggestion
    if (x.state === 'NJ') {
      const o = p.gender !== 'X' ? await override(x.name) : null
      if (o) { choice = x.prospects.find((q: any) => q.wrestler) && s?.type === 'prospect' ? s : { type: 'wrestler', id: o }; picked++ }
      else if (s && s.type !== 'new') { choice = s; nj++ }
    } else if (s?.type === 'wrestler' && p.gender !== 'X') {
      const w = x.wrestlers.find((w: any) => w.id === s.id)
      const st = (w?.schools ?? []).map((n: string) => n.match(/\(([A-Z]{2})\)\s*$/)?.[1] ?? 'NJ')
      if (w.is_oos && st.includes(x.state)) { choice = s; oos++ }
    } else if (s?.type === 'prospect') choice = s
    people[x.key] = { choice, state: x.state, club_id: null }
  }
  const res = await I.POST(req({ gender: p.gender, event_id: p.event_id, kind: 'podium', style: p.style, text: p.text, action: 'save', people }))
  const d = await res.json()
  console.log(`${p.label}: ${res.status} saved ${d.saved ?? 0} · new prospects ${d.prospects_created} · linked to HS ${d.prospects_linked} (NJ matches ${nj}, Kyle's picks ${picked}, out-of-state same state ${oos})${d.error ? ' ERROR ' + d.error : ''}`)
}
