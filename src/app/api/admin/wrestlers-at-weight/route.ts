import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const BOYS_WEIGHTS  = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const GIRLS_WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId  = req.nextUrl.searchParams.get('school_id')
  const weightCls = req.nextUrl.searchParams.get('weight_class')
  const gender    = req.nextUrl.searchParams.get('gender') ?? 'boys'

  if (!schoolId || !weightCls) return NextResponse.json({ wrestlers: [] })

  const weights = gender === 'girls' ? GIRLS_WEIGHTS : BOYS_WEIGHTS
  const wNum = parseInt(weightCls)
  const idx = weights.indexOf(wNum)
  const start = idx === -1 ? 0 : Math.max(0, idx - 2)
  const end   = idx === -1 ? weights.length - 1 : Math.min(weights.length - 1, idx + 2)
  const adjacentWeights = weights.slice(start, end + 1).map(String)

  const db = createSupabaseAdmin()

  // Find wrestlers who competed for this school at adjacent weights via match history
  const matchTable = gender === 'girls' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const { data: matchRows } = await db
    .from(matchTable)
    .select('wrestler_a_id, wrestler_b_id, school_a_id, school_b_id')
    .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
    .in('weight_class', adjacentWeights)

  const wrestlerIds = new Set<string>()
  for (const row of matchRows ?? []) {
    if (String(row.school_a_id) === schoolId && row.wrestler_a_id) {
      wrestlerIds.add(row.wrestler_a_id)
    }
    if (String(row.school_b_id) === schoolId && row.wrestler_b_id) {
      wrestlerIds.add(row.wrestler_b_id)
    }
  }

  if (wrestlerIds.size === 0) return NextResponse.json({ wrestlers: [] })

  const { data: wrestlers } = await db
    .from('wrestlers')
    .select('id, first_name, last_name')
    .in('id', [...wrestlerIds])
    .eq('is_oos', false)
    .order('last_name')

  return NextResponse.json({ wrestlers: wrestlers ?? [] })
}
