// Tournament hub prospects: the one list of every kid seen on a hub podium or in a hub bout.
// GET ?q= searches by name (or ?unknown_state=1 lists those with no state yet); ?hs= searches high
// school wrestlers on this side to link one. PATCH edits a prospect, including its high school link.
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { hubTables, CLUBS_TABLE } from '@/lib/hub'
import { schoolsOfWrestlers } from '@/lib/hubSchools'
import { mixedSexOf } from '@/lib/hubSex'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const T = hubTables(a.gender)

  const hs = sp.get('hs')?.trim()
  if (hs) {
    const parts = hs.split(/\s+/)
    let q = a.db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos, gender').limit(25)
    const side = sp.get('sex')
    if (a.gender !== 'X') q = q.eq('gender', a.gender)
    else if (side === 'M' || side === 'F') q = q.eq('gender', side)   // the mixed pool: this admin side's wrestlers
    q = parts.length > 1 ? q.ilike('first_name', `${parts[0]}%`).ilike('last_name', `${parts.slice(1).join(' ')}%`) : q.ilike('last_name', `${parts[0]}%`)
    const { data, error } = await q.order('last_name').order('first_name')
    if (error) return bad(error.message, 500)
    return NextResponse.json({ wrestlers: data ?? [] })
  }

  const term = sp.get('q')?.trim() ?? ''
  // the Middle School Hub's mixed pool shows this side's kids only (?sex=M|F): read more, keep this side's 200
  const sex = a.gender === 'X' && (sp.get('sex') === 'M' || sp.get('sex') === 'F') ? sp.get('sex') : null
  let q = a.db.from(T.prospects).select('id, first_name, last_name, state, class_year, club_id, club_listed, wrestler_id, notes').limit(sex ? 1000 : 200)
  if (sp.get('unknown_state')) q = q.is('state', null)
  if (term) {
    const parts = term.split(/\s+/)
    q = parts.length > 1 ? q.ilike('first_name', `${parts[0]}%`).ilike('last_name', `${parts.slice(1).join(' ')}%`) : q.or(`last_name.ilike.${parts[0]}%,first_name.ilike.${parts[0]}%`)
  }
  const { data: read, error } = await q.order('last_name').order('first_name')
  if (error) return bad(error.message, 500)
  let prospects = read ?? []
  if (sex) { const of = await mixedSexOf(a.db, prospects.map(p => p.id)); prospects = prospects.filter(p => of.get(p.id) === sex).slice(0, 200) }
  const ids = (prospects ?? []).map(p => p.id)

  // Each prospect's finishes and bout record on either hub
  const count = new Map<number, { podiums: number; best: number | null; wins: number; losses: number }>()
  const c = (id: number) => count.get(id) ?? count.set(id, { podiums: 0, best: null, wins: 0, losses: 0 }).get(id)!
  if (ids.length) {
    const [{ data: pl }, { data: bw }, { data: bl }] = await Promise.all([
      a.db.from(T.placements).select('prospect_id, place, place_to').in('prospect_id', ids),
      a.db.from(T.bouts).select('winner_prospect_id').in('winner_prospect_id', ids),
      a.db.from(T.bouts).select('loser_prospect_id').in('loser_prospect_id', ids),
    ])
    for (const r of pl ?? []) { const x = c(r.prospect_id); if (r.place <= 8 && !r.place_to) x.podiums++; x.best = x.best == null ? r.place : Math.min(x.best, r.place) }
    for (const r of bw ?? []) c(r.winner_prospect_id).wins++
    for (const r of bl ?? []) c(r.loser_prospect_id).losses++
  }
  const clubIds = [...new Set((prospects ?? []).map(p => p.club_id).filter(Boolean))] as number[]
  const { data: clubs } = clubIds.length ? await a.db.from(CLUBS_TABLE).select('id, name').in('id', clubIds) : { data: [] }
  const wIds = [...new Set((prospects ?? []).map(p => p.wrestler_id).filter(Boolean))] as string[]
  const { data: ws } = wIds.length ? await a.db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', wIds) : { data: [] }
  const clubName = new Map((clubs ?? []).map(x => [x.id, x.name])), wMap = new Map((ws ?? []).map(w => [w.id, w]))
  const school = await schoolsOfWrestlers(a.db, wIds)

  return NextResponse.json({
    prospects: (prospects ?? []).map(p => ({
      ...p, club: p.club_id ? clubName.get(p.club_id) ?? null : null,
      wrestler: p.wrestler_id && wMap.has(p.wrestler_id) ? { id: p.wrestler_id, name: `${wMap.get(p.wrestler_id)!.first_name} ${wMap.get(p.wrestler_id)!.last_name}`, school: school.get(p.wrestler_id) ?? null, class_year: wMap.get(p.wrestler_id)!.graduation_year } : null,
      ...(count.get(p.id) ?? { podiums: 0, best: null, wins: 0, losses: 0 }),
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const T = hubTables(a.gender)
  const id = Number(body.id)
  if (!id) return bad('id is required')
  const patch: Record<string, unknown> = {}
  for (const f of ['first_name', 'last_name', 'notes'] as const) if (body[f] !== undefined) patch[f] = String(body[f] ?? '').trim() || null
  if (patch.first_name === null || patch.last_name === null) return bad('A first and last name are required')
  if (body.state !== undefined) {
    const s = String(body.state ?? '').trim().toUpperCase()
    if (s && !/^[A-Z]{2}$/.test(s)) return bad('State is a two-letter code')
    patch.state = s || null
  }
  if (body.class_year !== undefined) {
    const y = body.class_year === null || body.class_year === '' ? null : Number(body.class_year)
    if (y !== null && !(Number.isInteger(y) && y >= 2000 && y <= 2100)) return bad('Class year is a graduation year, e.g. 2030')
    patch.class_year = y
  }
  if (body.club_id !== undefined) patch.club_id = body.club_id ? Number(body.club_id) : null
  if (body.wrestler_id !== undefined) {
    if (body.wrestler_id) {
      const { data: w } = await a.db.from('wrestlers').select('id, gender, graduation_year, is_oos').eq('id', body.wrestler_id).maybeSingle()
      if (!w) return bad('That wrestler was not found')
      if (a.gender !== 'X' && w.gender !== a.gender) return bad('That wrestler is on the other side')
      const { data: other } = await a.db.from(T.prospects).select('id, first_name, last_name').eq('wrestler_id', w.id).neq('id', id).maybeSingle()
      if (other) return bad(`${other.first_name} ${other.last_name} (prospect ${other.id}) is already linked to that wrestler`, 409)
      patch.wrestler_id = w.id
      if (w.graduation_year && body.class_year === undefined) patch.class_year = w.graduation_year
      if (!w.is_oos && body.state === undefined) patch.state = 'NJ'
    } else patch.wrestler_id = null
  }
  if (!Object.keys(patch).length) return bad('Nothing to change')
  const { data, error } = await a.db.from(T.prospects).update(patch).eq('id', id).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ prospect: data })
}
