import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import type { HammerConfig } from '@/lib/hammerConfig'

export const dynamic = 'force-dynamic'

export type PreviewRow = {
  wrestler_id: string
  first_name: string
  last_name: string
  weight_class: string | null
  // current (stored) components and total
  cur_ps:    number
  cur_tour:  number
  cur_match: number
  cur_total: number
  // preview (draft config applied) components and total
  pre_ps:    number
  pre_tour:  number
  pre_match: number
  pre_total: number
  delta: number
}

export async function POST(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { gender, season, config } = body as {
    gender: 'M' | 'F'
    season: string
    config: HammerConfig
  }

  if (!gender || !season || !config) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const cc = config.component_ceilings

  // Fetch all current scores for this gender/season
  const PAGE = 500
  const allScores: {
    wrestler_id: string
    postseason_adjusted: number
    tournament_score: number
    match_score: number
    hammer_score: number
    weight_class: string | null
  }[] = []

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from('wrestler_hammer_scores')
      .select('wrestler_id, postseason_adjusted, tournament_score, match_score, hammer_score, weight_class')
      .eq('season', season)
      .eq('gender', gender)
      .range(offset, offset + PAGE - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    allScores.push(...(data as typeof allScores))
    if (data.length < PAGE) break
  }

  if (!allScores.length) {
    return NextResponse.json({ rows: [], summary: { affected: 0, avgDelta: 0, maxDelta: 0 } })
  }

  // Fetch names
  const wrestlerIds = allScores.map(s => s.wrestler_id)
  const nameMap = new Map<string, { first_name: string; last_name: string }>()
  const CHUNK = 100
  for (let i = 0; i < wrestlerIds.length; i += CHUNK) {
    const { data } = await db
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('id', wrestlerIds.slice(i, i + CHUNK))
    for (const w of (data ?? [])) nameMap.set(w.id, { first_name: w.first_name ?? '', last_name: w.last_name ?? '' })
  }

  // Apply draft config ceilings to each stored score
  const rows: PreviewRow[] = allScores.map(s => {
    const cur_ps    = Number(s.postseason_adjusted)
    const cur_tour  = Number(s.tournament_score)
    const cur_match = Number(s.match_score)
    const cur_total = Number(s.hammer_score)

    const pre_ps    = Math.min(cur_ps,    cc.postseason)
    const pre_tour  = Math.min(cur_tour,  cc.tournament)
    const pre_match = Math.min(cur_match, cc.match)
    const pre_total = Math.round((pre_ps + pre_tour + pre_match) * 100) / 100
    const delta     = Math.round((pre_total - cur_total) * 100) / 100

    const name = nameMap.get(s.wrestler_id) ?? { first_name: '?', last_name: '?' }

    return {
      wrestler_id: s.wrestler_id,
      first_name:  name.first_name,
      last_name:   name.last_name,
      weight_class: s.weight_class,
      cur_ps, cur_tour, cur_match, cur_total,
      pre_ps, pre_tour, pre_match, pre_total,
      delta,
    }
  })

  // Sort by abs(delta) descending, then by cur_total descending for ties
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.cur_total - a.cur_total)

  const affected = rows.filter(r => r.delta !== 0).length
  const avgDelta = affected > 0
    ? Math.round(rows.filter(r => r.delta !== 0).reduce((s, r) => s + r.delta, 0) / affected * 100) / 100
    : 0
  const maxDelta = rows.length > 0 ? Math.abs(rows[0].delta) : 0

  return NextResponse.json({
    rows: rows.slice(0, 100),   // top 100 movers
    summary: { affected, avgDelta, maxDelta, total: allScores.length },
  })
}
