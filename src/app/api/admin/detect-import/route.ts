import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText } from '@/lib/parseRtf'
import { parseDualMeetText } from '@/lib/parseDualMeet'
import { parseDualMeetGirlsText } from '@/lib/parseDualMeetGirls'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string
  let gender: 'M' | 'F' = 'M'
  try {
    const body = await req.json()
    text = body.text ?? ''
    if (body.gender === 'F') gender = 'F'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const tournaments = parseRtfText(text)
  const meets = gender === 'F' ? parseDualMeetGirlsText(text) : parseDualMeetText(text)

  const hasTournament = tournaments.length > 0
  const hasDual = meets.length > 0

  // If both match, prefer tournament (tournament headers are more specific)
  const type: 'tournament' | 'dual' | 'unknown' =
    hasTournament ? 'tournament' :
    hasDual       ? 'dual' :
    'unknown'

  return NextResponse.json({
    type,
    tournament_count: tournaments.length,
    dual_count: meets.length,
  })
}
