import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const revalidate = 300

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRpcAll(supabase: any, rpcName: string, params: object): Promise<any[]> {
  const PAGE = 1000
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
    const [wrestlers, teams] = await Promise.all([
      fetchRpcAll(supabase, 'lb_rs_individual_stats', p),
      fetchRpcAll(supabase, 'lb_rs_team_stats',       p),
    ])
    return NextResponse.json({ wrestlers, teams })
  } catch (err) {
    return NextResponse.json({ error: String(err), wrestlers: [], teams: [] }, { status: 500 })
  }
}
