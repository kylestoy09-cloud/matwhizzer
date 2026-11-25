// Tournament hub: one year of a tournament — its podiums and bouts, with who each kid is.
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { hubTables, isHubStyle, CLUBS_TABLE } from '@/lib/hub'
import { mixedSexOf } from '@/lib/hubSex'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const id = Number(sp.get('id'))
  if (!id) return bad('id is required')
  const T = hubTables(a.gender)

  const { data: event, error } = await a.db.from(T.events).select('*').eq('id', id).maybeSingle()
  if (error) return bad(error.message, 500)
  if (!event) return bad('Not found', 404)
  const [{ data: tournament }, { data: placementsAll, error: pErr }, { data: boutsAll, error: bErr }] = await Promise.all([
    a.db.from(T.tournaments).select('*').eq('id', event.tournament_id).single(),
    a.db.from(T.placements).select('*').eq('event_id', id).order('id'),
    a.db.from(T.bouts).select('*').eq('event_id', id).order('id'),
  ])
  if (pErr || bErr) return bad((pErr ?? bErr)!.message, 500)
  // the Middle School Hub's mixed pool: this side's kids only (?sex=M|F)
  let placements = placementsAll ?? [], bouts = boutsAll ?? []
  const sex = sp.get('sex')
  if (a.gender === 'X' && (sex === 'M' || sex === 'F')) {
    const of = await mixedSexOf(a.db, [...new Set([...placements.map(p => p.prospect_id), ...bouts.flatMap(b => [b.winner_prospect_id, b.loser_prospect_id])])])
    placements = placements.filter(p => of.get(p.prospect_id) === sex)
    bouts = bouts.filter(b => of.get(b.winner_prospect_id) === sex && of.get(b.loser_prospect_id) === sex)
  }

  const prospectIds = [...new Set([
    ...placements.map(p => p.prospect_id),
    ...bouts.flatMap(b => [b.winner_prospect_id, b.loser_prospect_id]),
  ])]
  const prospects = new Map<number, Record<string, unknown>>()
  for (let i = 0; i < prospectIds.length; i += 500) {
    const { data } = await a.db.from(T.prospects).select('id, first_name, last_name, state, class_year, club_id, wrestler_id').in('id', prospectIds.slice(i, i + 500))
    for (const p of data ?? []) prospects.set(p.id, p)
  }
  const clubIds = [...new Set([...placements.map(p => p.club_id), ...[...prospects.values()].map(p => p.club_id)].filter(Boolean))] as number[]
  const { data: clubs } = clubIds.length ? await a.db.from(CLUBS_TABLE).select('id, name, state').in('id', clubIds) : { data: [] }
  const wrestlerIds = [...new Set([...prospects.values()].map(p => p.wrestler_id).filter(Boolean))] as string[]
  const wrestlers: { id: string; first_name: string; last_name: string; graduation_year: number | null }[] = []
  for (let i = 0; i < wrestlerIds.length; i += 300) {   // in chunks: hundreds of ids don't fit in one request
    const { data } = await a.db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', wrestlerIds.slice(i, i + 300))
    wrestlers.push(...(data ?? []))
  }

  return NextResponse.json({
    event, tournament,
    placements, bouts,
    prospects: Object.fromEntries(prospects),
    clubs: Object.fromEntries((clubs ?? []).map(c => [c.id, c])),
    wrestlers: Object.fromEntries(wrestlers.map(w => [w.id, w])),
  })
}

// Clear a style's podium or the bouts for this year, so it can be imported again (asked for in the page,
// which shows how many rows go first). Prospects stay: they may have finishes elsewhere.
export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const id = Number(sp.get('id')), what = sp.get('what'), style = sp.get('style')
  if (!id) return bad('id is required')
  if (!isHubStyle(style)) return bad('style must be folkstyle or freestyle')
  const T = hubTables(a.gender)
  const table = what === 'podium' ? T.placements : what === 'bouts' ? T.bouts : null
  if (!table) return bad('what must be podium or bouts')
  const { data, error } = await a.db.from(table).delete().eq('event_id', id).eq('style', style).select('id')
  if (error) return bad(error.message, 500)
  return NextResponse.json({ removed: data?.length ?? 0 })
}
