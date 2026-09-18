import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/playoff-seeds?season_id=2&gender=M
// Returns saved seeds for all section/groups (or empty if not yet saved)
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const season_id = parseInt(params.get('season_id') ?? '2')
  const gender = params.get('gender') ?? 'M'

  const db = service()
  const { data, error } = await db
    .from('playoff_seeds')
    .select('section, classification, seed, school_id, confirmed, schools(id, display_name, logo_url, primary_color)')
    .eq('season_id', season_id)
    .eq('gender', gender)
    .order('seed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ seeds: data ?? [] })
}

// POST /api/admin/playoff-seeds
// Body: { season_id, gender, section, classification, seeds: [{seed, school_id}], confirmed }
export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { season_id, gender, section, classification, seeds, confirmed } = body

  if (!season_id || !section || !classification || !Array.isArray(seeds)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = service()
  const g = gender ?? 'M'

  console.log('[playoff-seeds POST]', JSON.stringify({ season_id, gender: g, section, classification, confirmed, seedCount: seeds.length, seeds }))

  // Supabase upsert silently skips updates on existing rows — delete then insert instead
  const { error: delErr } = await db
    .from('playoff_seeds')
    .delete()
    .eq('season_id', season_id)
    .eq('gender', g)
    .eq('section', section)
    .eq('classification', classification)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  const rows = seeds.map((s: { seed: number; school_id: number | null }) => ({
    season_id,
    gender: g,
    section,
    classification,
    seed: s.seed,
    school_id: s.school_id ?? null,
    confirmed: confirmed ?? false,
    updated_at: new Date().toISOString(),
  }))

  const { error: insErr } = await db.from('playoff_seeds').insert(rows)

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
