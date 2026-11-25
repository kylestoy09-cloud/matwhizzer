// Wrestling clubs (shared by both sides, like schools): the Clubs tab on each tournament hub.
// A club's state is how a kid listed under it is known to be from NJ. GET also lists the club names results
// gave on this hub's pool that aren't on the list yet (Kyle 2026-11-12: "no clubs are populated"); adding a club or
// another spelling links the kids already loaded under that name, on every pool (the club list is shared).
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { CLUBS_TABLE, clubKey, hubTables, type HubGender } from '@/lib/hub'
import type { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const TEXT = ['name', 'town', 'region', 'website', 'leadership', 'pipelines', 'tournaments', 'notes'] as const

function fields(body: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  for (const f of TEXT) if (body[f] !== undefined) out[f] = String(body[f] ?? '').trim() || null
  if ('name' in out && !out.name) return 'A club name is required'
  if (body.state !== undefined) {
    const s = String(body.state ?? '').trim().toUpperCase()
    if (!/^[A-Z]{2}$/.test(s)) return 'State is a two-letter code'
    out.state = s
  }
  if (body.aliases !== undefined) {
    const list = Array.isArray(body.aliases) ? body.aliases : String(body.aliases ?? '').split(/[;\n]/)
    out.aliases = [...new Set(list.map(x => String(x).trim()).filter(Boolean))]
  }
  return out
}

type Db = ReturnType<typeof createSupabaseAdmin>

// This pool's kids whose listed club isn't linked to a club yet
async function unlinked(db: Db, gender: HubGender) {
  const out: { id: number; club_listed: string; state: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(hubTables(gender).prospects).select('id, club_listed, state').is('club_id', null).not('club_listed', 'is', null).order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}

// Link the kids (and their places) listed under this club's name or another spelling of it, on all three pools
async function relink(db: Db, club: { id: number; name: string; state: string; aliases: string[] | null }) {
  const keys = new Set([club.name, ...(club.aliases ?? [])].map(clubKey))
  for (const g of ['M', 'F', 'X'] as const) {
    const T = hubTables(g)
    const ids = (await unlinked(db, g)).filter(p => keys.has(clubKey(p.club_listed)))
    for (let i = 0; i < ids.length; i += 300) {
      const part = ids.slice(i, i + 300)
      await db.from(T.prospects).update({ club_id: club.id }).in('id', part.map(p => p.id))
      const noState = part.filter(p => !p.state).map(p => p.id)
      if (noState.length) await db.from(T.prospects).update({ state: club.state }).in('id', noState)
      await db.from(T.placements).update({ club_id: club.id }).in('prospect_id', part.map(p => p.id)).is('club_id', null)
    }
  }
}

export async function GET(req: NextRequest) {
  const a = await hubAdmin(req.nextUrl.searchParams.get('gender'))
  if (a.error) return a.error
  const { data, error } = await a.db.from(CLUBS_TABLE).select('*').order('name')
  if (error) return bad(error.message, 500)
  let kids: Awaited<ReturnType<typeof unlinked>>
  try { kids = await unlinked(a.db, a.gender) } catch (e) { return bad((e as Error).message, 500) }
  const seen = new Map<string, { name: string; kids: number; nj: number }>()
  for (const k of kids) {
    const key = clubKey(k.club_listed)
    if (!key) continue
    const s = seen.get(key) ?? seen.set(key, { name: k.club_listed, kids: 0, nj: 0 }).get(key)!
    s.kids++; if (k.state === 'NJ') s.nj++
  }
  return NextResponse.json({ clubs: data ?? [], unlisted: [...seen.values()].sort((x, y) => y.kids - x.kids || x.name.localeCompare(y.name)) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const row = fields({ state: 'NJ', ...body })
  if (typeof row === 'string') return bad(row)
  if (!row.name) return bad('A club name is required')
  const { data, error } = await a.db.from(CLUBS_TABLE).insert(row).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That club is already listed' : error.message, error.code === '23505' ? 409 : 500)
  try { await relink(a.db, data) } catch (e) { return bad(`The club was saved, but linking its kids failed: ${(e as Error).message}`, 500) }
  return NextResponse.json({ club: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const a = await hubAdmin(body?.gender)
  if (a.error) return a.error
  const id = Number(body.id)
  if (!id) return bad('id is required')
  const patch = fields(body)
  if (typeof patch === 'string') return bad(patch)
  if (!Object.keys(patch).length) return bad('Nothing to change')
  const { data, error } = await a.db.from(CLUBS_TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
  if (error) return bad(error.code === '23505' ? 'That club is already listed' : error.message, error.code === '23505' ? 409 : 500)
  try { await relink(a.db, data) } catch (e) { return bad(`The club was saved, but linking its kids failed: ${(e as Error).message}`, 500) }
  return NextResponse.json({ club: data })
}
