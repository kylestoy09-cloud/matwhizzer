import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/school-season-status?schoolId=X&seasonId=Y&gender=M
// Returns { inactive: boolean }
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = req.nextUrl.searchParams.get('schoolId')
  const seasonId = req.nextUrl.searchParams.get('seasonId')
  const gender   = req.nextUrl.searchParams.get('gender') ?? 'M'
  if (!schoolId || !seasonId) {
    return NextResponse.json({ error: 'Missing schoolId or seasonId' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const { data } = await db
    .from('inactive_school_seasons')
    .select('school_id')
    .eq('school_id', Number(schoolId))
    .eq('season_id', Number(seasonId))
    .eq('gender', gender)
    .maybeSingle()

  return NextResponse.json({ inactive: data !== null })
}

// POST /api/admin/school-season-status
// body: { schoolId, seasonId, gender, action: 'deactivate' | 'activate' }
//
// deactivate: inserts inactive row + removes school from gender-specific season groups
// activate:   deletes inactive row (groups are not restored automatically)
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schoolId, seasonId, gender, action } = await req.json()
  if (!schoolId || !seasonId || !gender || !['deactivate', 'activate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }
  if (!['M', 'F'].includes(gender)) {
    return NextResponse.json({ error: 'gender must be M or F' }, { status: 400 })
  }

  const sid  = Number(schoolId)
  const snid = Number(seasonId)
  const db   = createSupabaseAdmin()

  if (action === 'activate') {
    const { error } = await db
      .from('inactive_school_seasons')
      .delete()
      .eq('school_id', sid)
      .eq('season_id', snid)
      .eq('gender', gender)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, inactive: false })
  }

  // deactivate: mark inactive + remove from gender-specific seasonal groups
  const { error: insertErr } = await db
    .from('inactive_school_seasons')
    .upsert(
      { school_id: sid, season_id: snid, gender },
      { onConflict: 'school_id,season_id,gender' }
    )
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const distTable  = gender === 'M' ? 'boys_school_districts'  : 'girls_school_districts'
  const regTable   = gender === 'M' ? 'boys_school_regions'    : 'girls_school_regions'
  const confTable  = gender === 'M' ? 'boys_school_conferences' : 'girls_school_conferences'

  await Promise.all([
    db.from(distTable).delete().eq('school_id', sid).eq('season_id', snid),
    db.from(regTable).delete().eq('school_id', sid).eq('season_id', snid),
    db.from(confTable).delete().eq('school_id', sid).eq('season_id', snid),
  ])

  return NextResponse.json({ ok: true, inactive: true })
}
