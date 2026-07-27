import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText, parseDateRange } from '@/lib/parseRtf'
import type { TournamentSummary } from '@/app/admin/import-rtf/types'

export const dynamic = 'force-dynamic'

const SEASON = '2025-26'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string
  let year: number
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = parseRtfText(text)
  if (!parsed.length) {
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const isRtf = lines[0]?.startsWith('{\\rtf') || lines[0]?.startsWith('\\rtf')
    const preview = lines.slice(0, 5).map((l: string) => l.slice(0, 120)).join('\n')
    const hint = isRtf
      ? 'The pasted content looks like raw RTF markup. Convert it first:\n  textutil -convert txt -stdout "file.rtf" | pbcopy'
      : `No lines matched the expected header format ("Tournament Name - MM/DD").\n\nFirst lines received:\n${preview || '(empty)'}`
    return NextResponse.json({ error: hint, tournaments: [] })
  }

  const client = serviceClient()
  const summaries: TournamentSummary[] = []

  for (const t of parsed) {
    const [start_date, end_date] = parseDateRange(t.date_raw, year)
    const existing = await client
      .from('in_season_tournaments')
      .select('id')
      .eq('name', t.name)
      .eq('season', SEASON)
      .maybeSingle()

    let has_bouts = false
    if (existing.data?.id) {
      const bq = await client
        .from('tournament_bouts')
        .select('id', { count: 'exact', head: true })
        .eq('in_season_tournament_id', existing.data.id)
      has_bouts = (bq.count ?? 0) > 0
    }

    summaries.push({
      name: t.name,
      date_raw: t.date_raw,
      start_date,
      end_date,
      source_format: t.source_format,
      bout_count: t.bout_count,
      placement_count: t.placement_count,
      existing_id: existing.data?.id ?? null,
      has_existing_bouts: has_bouts,
    })
  }

  return NextResponse.json({ tournaments: summaries })
}
