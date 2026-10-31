import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const revalidate = 300

// Every page re-runs the whole function, so ask for everything in one page (the API
// returns up to 100,000 rows); the loop only matters past that.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRpcAll(supabase: any, rpcName: string, params: object): Promise<any[]> {
  const PAGE = 100_000
  const rows: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .rpc(rpcName, params)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${rpcName}: ${error.message}`)
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE) break
    from += PAGE
  }
  return rows
}

// Best hammer score per school per weight class. wrestler_hammer_scores is not
// readable with the anon key, so the team hammer aggregate is built here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchHammerMax(supabase: any, seasonId: number, gender: string) {
  const { data: season } = await supabase.from('seasons').select('year_label').eq('id', seasonId).maybeSingle()
  if (!season?.year_label) return []
  const { data, error } = await fetchAllRows<{ school_id: number | null; weight_class: string | null; hammer_score: number }>((from, to) =>
    supabase.from('wrestler_hammer_scores')
      .select('school_id, weight_class, hammer_score')
      .eq('season', season.year_label)
      .eq('gender', gender)
      .not('school_id', 'is', null)
      .not('weight_class', 'is', null)
      .order('wrestler_id')
      .range(from, to))
  if (error) throw new Error(`wrestler_hammer_scores: ${error.message}`)
  const best = new Map<string, { school_id: number; weight_class: string; hammer_score: number }>()
  for (const r of data) {
    const key = `${r.school_id}|${r.weight_class}`
    const cur = best.get(key)
    if (!cur || r.hammer_score > cur.hammer_score) {
      best.set(key, { school_id: r.school_id!, weight_class: r.weight_class!, hammer_score: r.hammer_score })
    }
  }
  return [...best.values()]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const seasonId = parseInt(searchParams.get('season_id') ?? '2')
  const gender = searchParams.get('gender') ?? 'M'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
  const p = { p_season_id: seasonId, p_gender: gender }

  try {
    const [rows, teams, hammerMax] = await Promise.all([
      fetchRpcAll(supabase, 'lb_rs_individual_stats', p),
      fetchRpcAll(supabase, 'lb_rs_team_stats',       p),
      fetchHammerMax(supabase, seasonId, gender),
    ])
    // A school's details go once in `schools`, not on each of its wrestlers' rows;
    // the leaderboard joins them back (see unpackRsLeaders)
    const schools: Record<number, unknown[]> = {}
    const wrestlers = rows.map(({ school_name, section, classification, athletic_conference, logo_url, color_primary, ...w }) => {
      schools[w.school_id] ??= [school_name, section, classification, athletic_conference, logo_url, color_primary]
      return w
    })
    // Cached at the edge for 5 minutes; after that the old copy is served while a new one builds
    return NextResponse.json({ wrestlers, schools, teams, hammerMax }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), wrestlers: [], teams: [], hammerMax: [] }, { status: 500 })
  }
}
