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
  if (q.length < 2) return NextResponse.json({ wrestlers: [] })

  const client = serviceClient()

  // Search by first+last name combined. Split on space if provided.
  const parts = q.split(/\s+/)
  let query = client
    .from('wrestlers')
    .select(`
      id, first_name, last_name, gender,
      school:schools ( id, display_name )
    `)
    .eq('is_oos', false)
    .limit(20)

  if (parts.length >= 2) {
    // "First Last" — match both parts
    query = query
      .ilike('first_name', `%${parts[0]}%`)
      .ilike('last_name', `%${parts.slice(1).join(' ')}%`)
  } else {
    // Single token — match either name
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
  }

  const { data, error } = await query.order('last_name').order('first_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrestlers = (data ?? []).map((w: any) => ({
    id: w.id,
    name: `${w.first_name} ${w.last_name}`,
    gender: w.gender,
    school: w.school?.display_name ?? null,
    school_id: w.school?.id ?? null,
  }))

  return NextResponse.json({ wrestlers })
}
