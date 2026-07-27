import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim() ?? ''
  const school_id = params.get('school_id')

  if (!q) return NextResponse.json({ wrestlers: [] })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Search by full name concat or last name within the given school
  let query = supabase
    .from('wrestlers')
    .select('id, first_name, last_name')
    .or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
    .order('last_name')
    .limit(12)

  if (school_id) {
    // Filter to wrestlers at this school via tournament_entries
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('wrestler_id')
      .eq('school_id', Number(school_id))
      .limit(2000)

    if (entries && entries.length > 0) {
      const ids = [...new Set(entries.map(e => e.wrestler_id).filter(Boolean))]
      query = query.in('id', ids)
    }
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const wrestlers = (data ?? []).map(w => ({
    id: w.id,
    display_name: `${w.first_name} ${w.last_name}`.trim(),
  }))

  return NextResponse.json({ wrestlers })
}
