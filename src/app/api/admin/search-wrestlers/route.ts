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
  const gender = params.get('gender') ?? 'M'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // If school_id provided, return the full roster for that school (filter locally on client)
  if (school_id) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('wrestler_id')
      .eq('school_id', Number(school_id))
      .limit(2000)

    const ids = [...new Set((entries ?? []).map((e: { wrestler_id: string }) => e.wrestler_id).filter(Boolean))]
    if (ids.length === 0) return NextResponse.json({ wrestlers: [] })

    const { data, error } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('id', ids)
      .eq('gender', gender)
      .order('last_name')
      .limit(500)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const wrestlers = (data ?? []).map((w: { id: string; first_name: string; last_name: string }) => ({
      id: w.id,
      display_name: `${w.first_name} ${w.last_name}`.trim(),
    }))
    return NextResponse.json({ wrestlers })
  }

  // Fallback: name search across all wrestlers
  if (!q) return NextResponse.json({ wrestlers: [] })

  const { data, error } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name')
    .or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%`)
    .eq('gender', gender)
    .order('last_name')
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const wrestlers = (data ?? []).map((w: { id: string; first_name: string; last_name: string }) => ({
    id: w.id,
    display_name: `${w.first_name} ${w.last_name}`.trim(),
  }))
  return NextResponse.json({ wrestlers })
}
