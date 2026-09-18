import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ tournaments: [] })

  const gender = req.nextUrl.searchParams.get('gender') as 'M' | 'F' | null

  const client = serviceClient()
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const istTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  if (UUID_RE.test(q)) {
    // Try boys first, then girls
    const { data: boysData } = await client
      .from('in_season_tournaments')
      .select('id, name, start_date, season')
      .eq('id', q)
      .limit(1)
    if (boysData?.length) return NextResponse.json({ tournaments: boysData })
    const { data: girlsData } = await client
      .from('in_season_tournaments_girls')
      .select('id, name, start_date, season')
      .eq('id', q)
      .limit(1)
    return NextResponse.json({ tournaments: girlsData ?? [] })
  }

  // Name search against the gender-appropriate table
  const { data } = await client
    .from(istTable)
    .select('id, name, start_date, season')
    .ilike('name', `%${q}%`)
    .order('start_date', { ascending: false })
    .limit(8)

  return NextResponse.json({ tournaments: data ?? [] })
}
