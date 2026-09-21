import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getWorkingSeason } from '@/lib/season-context'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender: 'M' | 'F' = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const season = (await getWorkingSeason(gender)).label
  const db = createSupabaseAdmin()

  const PAGE = 500
  const allScores: Record<string, unknown>[] = []

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from('wrestler_hammer_scores')
      .select('wrestler_id, postseason_adjusted, tournament_score, match_score, hammer_score, match_count, last_match_date, weight_class, conference, section, classification, district, region, last_calculated_at')
      .eq('season', season)
      .eq('gender', gender)
      .order('hammer_score', { ascending: false })
      .range(offset, offset + PAGE - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    allScores.push(...data)
    if (data.length < PAGE) break
  }

  if (!allScores.length) {
    return NextResponse.json({ rows: [], calculatedAt: null })
  }

  const wrestlerIds = allScores.map(s => s.wrestler_id as string)
  const nameMap = new Map<string, { first_name: string; last_name: string }>()
  const CHUNK = 100

  for (let i = 0; i < wrestlerIds.length; i += CHUNK) {
    const chunk = wrestlerIds.slice(i, i + CHUNK)
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', chunk)
    for (const w of (data ?? [])) {
      nameMap.set(w.id, { first_name: w.first_name ?? '', last_name: w.last_name ?? '' })
    }
  }

  const rows = allScores.map(s => {
    const name = nameMap.get(s.wrestler_id as string) ?? { first_name: '?', last_name: '?' }
    return {
      wrestler_id:         s.wrestler_id,
      first_name:          name.first_name,
      last_name:           name.last_name,
      postseason_adjusted: Number(s.postseason_adjusted),
      tournament_score:    Number(s.tournament_score),
      match_score:         Number(s.match_score),
      hammer_score:        Number(s.hammer_score),
      match_count:         s.match_count,
      last_match_date:     s.last_match_date ?? null,
      weight_class:        s.weight_class ?? null,
      conference:          s.conference ?? null,
      section:             s.section ?? null,
      classification:      s.classification ?? null,
      district:            s.district ?? null,
      region:              s.region ?? null,
      last_calculated_at:  s.last_calculated_at,
    }
  })

  const calculatedAt = (allScores[0]?.last_calculated_at as string | null) ?? null
  return NextResponse.json({ rows, calculatedAt })
}
