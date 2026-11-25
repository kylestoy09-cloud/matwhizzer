// Tournament hub leaderboard (admin): src/lib/hubLeaderboard.ts does the work; this route reads the request.
// ?state=all for every state (NJ kids by default), ?season= for one season (none = all), ?sex=M|F splits the
// Middle School Hub's mixed pool.
import { NextRequest, NextResponse } from 'next/server'
import { hubAdmin, bad } from '../_auth'
import { isHubKey } from '@/lib/hub'
import { hubLeaderboard } from '@/lib/hubLeaderboard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const a = await hubAdmin(sp.get('gender'))
  if (a.error) return a.error
  const hub = sp.get('hub')
  if (!isHubKey(hub)) return bad('hub must be ms or offseason')
  const sex = sp.get('sex') === 'F' ? 'F' : sp.get('sex') === 'M' ? 'M' : null
  try {
    return NextResponse.json(await hubLeaderboard(a.db, a.gender, hub, { season: sp.get('season') ? Number(sp.get('season')) : null, onlyNj: sp.get('state') !== 'all', sex }))
  } catch (e) {
    return bad((e as Error).message, 500)
  }
}
