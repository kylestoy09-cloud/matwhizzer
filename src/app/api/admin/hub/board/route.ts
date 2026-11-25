// The Insight Off-Season board's order (Kyle 2026-11-13), set on the admin Offseason Hub's "Public board" tab.
// GET ?gender=M|F → the board as the site shows it (fresh, not cached) with each entry's score for reference.
// PUT { gender, season, list, ids } → that list's order (a weight, or 'overall' for Most Notable Overall).
// DELETE ?gender=&season=&list= → back to the score order. Writes offseason_board_order; the site picks it up at once.
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { hubAdmin, bad } from '../_auth'
import { buildOffseasonBoard } from '@/lib/offseasonPublic'

export const dynamic = 'force-dynamic'

const sideOf = (g: unknown) => (g === 'M' || g === 'F' ? g : null)

export async function GET(req: NextRequest) {
  const gender = sideOf(req.nextUrl.searchParams.get('gender'))
  const a = await hubAdmin(gender)
  if (a.error) return a.error
  if (!gender) return bad('gender must be M or F')
  try { return NextResponse.json({ board: await buildOffseasonBoard(gender) }) } catch (e) { return bad((e as Error).message, 500) }
}

export async function PUT(req: NextRequest) {
  const b = await req.json().catch(() => null) as { gender?: string; season?: number; list?: string; ids?: string[] } | null
  const gender = sideOf(b?.gender)
  const a = await hubAdmin(gender)
  if (a.error) return a.error
  if (!gender || !b?.season || !b.list || !Array.isArray(b.ids)) return bad('gender, season, list and ids are required')
  const ids = [...new Set(b.ids.filter(x => typeof x === 'string'))]
  // the new order first, then anyone taken off: a failed write leaves the old order in place
  if (ids.length) {
    const { error } = await a.db.from('offseason_board_order').upsert(ids.map((id, i) => ({ gender, season: b.season, list: b.list, wrestler_id: id, position: i + 1, updated_at: new Date().toISOString(), updated_by: a.email })), { onConflict: 'gender,season,list,wrestler_id' })
    if (error) return bad(error.message, 500)
  }
  let del = a.db.from('offseason_board_order').delete().eq('gender', gender).eq('season', b.season).eq('list', b.list)
  if (ids.length) del = del.not('wrestler_id', 'in', `(${ids.join(',')})`)
  const { error: dErr } = await del
  if (dErr) return bad(dErr.message, 500)
  revalidateTag('offseason-board', { expire: 0 })
  return NextResponse.json({ ok: true, saved: ids.length })
}

export async function DELETE(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const gender = sideOf(sp.get('gender'))
  const a = await hubAdmin(gender)
  if (a.error) return a.error
  if (!gender || !sp.get('season') || !sp.get('list')) return bad('gender, season and list are required')
  const { error } = await a.db.from('offseason_board_order').delete().eq('gender', gender).eq('season', Number(sp.get('season'))).eq('list', sp.get('list')!)
  if (error) return bad(error.message, 500)
  revalidateTag('offseason-board', { expire: 0 })
  return NextResponse.json({ ok: true })
}
