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
  const oos = params.get('oos') === 'true'
  const limit = Math.min(parseInt(params.get('limit') ?? '12') || 12, 20)
  if (!q) return NextResponse.json({ schools: [] })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Check school_aliases first — exact alias matches rank above display_name fuzzy matches
  const { data: aliasData } = await supabase
    .from('school_aliases')
    .select('school_id, alias')
    .ilike('alias', `%${q}%`)
    .limit(limit)

  const aliasSchoolIds = (aliasData ?? []).map(a => a.school_id as number)
  let aliasSchools: Array<{ id: number; display_name: string; source: string }> = []
  if (aliasSchoolIds.length > 0) {
    const { data: schoolData } = await supabase
      .from('schools')
      .select('id, display_name')
      .in('id', aliasSchoolIds)
      .eq('is_nj', !oos)
    aliasSchools = (schoolData ?? []).map(s => ({ ...s, source: 'alias' }))
  }

  // 2. Display_name search — exclude schools already found via alias
  const aliasIdSet = new Set(aliasSchools.map(s => s.id))
  const { data: nameData, error } = await supabase
    .from('schools')
    .select('id, display_name')
    .ilike('display_name', `%${q}%`)
    .eq('is_nj', !oos)
    .order('display_name')
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const nameSchools = (nameData ?? [])
    .filter(s => !aliasIdSet.has(s.id))
    .map(s => ({ ...s, source: 'name' }))

  const schools = [...aliasSchools, ...nameSchools].slice(0, limit)
  return NextResponse.json({ schools })
}
