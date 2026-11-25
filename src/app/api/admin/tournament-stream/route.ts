// A tournament page's stream link (Kyle 2026-11-18: "a silent field for tournament pages so I can add if I find"):
// admins set it from the tournament page; the page shows "Stream ↗" only once it's set.
// PATCH { id, gender, stream_url }   (empty clears it)
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { cleanStreamingUrl } from '@/lib/streamingLinks'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const raw = String(b.stream_url ?? '').trim()
  const url = raw ? cleanStreamingUrl(raw) : null
  if (raw && !url) return NextResponse.json({ error: 'Not a web address' }, { status: 400 })
  const table = b.gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const { error } = await createSupabaseAdmin().from(table).update({ stream_url: url }).eq('id', b.id)
  if (error) return NextResponse.json({ error: /stream_url/.test(error.message) ? 'Run docs/migrations/20261118_meet_stream_and_details.sql in the Supabase SQL editor first.' : error.message }, { status: 500 })
  return NextResponse.json({ ok: true, stream_url: url })
}
