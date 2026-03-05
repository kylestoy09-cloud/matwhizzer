import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/picks?tournament_id=X&weight_class_id=Y&visitor_id=Z
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const tournamentId = Number(sp.get('tournament_id'))
  const weightClassId = Number(sp.get('weight_class_id'))
  const visitorId = sp.get('visitor_id') ?? ''

  if (!tournamentId || !weightClassId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Fetch aggregate results
  const { data: results } = await supabase.rpc('bracket_poll_results', {
    p_tournament_id: tournamentId,
    p_weight_class_id: weightClassId,
  })

  // Fetch this visitor's picks
  const { data: myPick } = await supabase
    .from('bracket_picks')
    .select('pick_1st, pick_2nd, pick_3rd, pick_4th')
    .eq('tournament_id', tournamentId)
    .eq('weight_class_id', weightClassId)
    .eq('visitor_id', visitorId)
    .maybeSingle()

  // Total unique voters
  const { count } = await supabase
    .from('bracket_picks')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('weight_class_id', weightClassId)

  return NextResponse.json({
    results: results ?? [],
    myPick: myPick ?? null,
    totalVoters: count ?? 0,
  })
}

// POST /api/picks
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tournament_id, weight_class_id, visitor_id, pick_1st, pick_2nd, pick_3rd, pick_4th } = body

  if (!tournament_id || !weight_class_id || !visitor_id) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bracket_picks')
    .upsert({
      tournament_id,
      weight_class_id,
      visitor_id,
      pick_1st: pick_1st || null,
      pick_2nd: pick_2nd || null,
      pick_3rd: pick_3rd || null,
      pick_4th: pick_4th || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tournament_id,weight_class_id,visitor_id',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
