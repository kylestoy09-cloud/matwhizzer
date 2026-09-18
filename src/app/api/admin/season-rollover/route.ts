import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GRADE_ORDER = ['Fr', 'So', 'Jr', 'Sr'] as const
type Grade = (typeof GRADE_ORDER)[number]

function nextGrade(g: Grade): Grade | null {
  const idx = GRADE_ORDER.indexOf(g)
  return idx < GRADE_ORDER.length - 1 ? GRADE_ORDER[idx + 1] : null // Sr → null (graduate)
}

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: null }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: null }
  return { user, email: user.email ?? '' }
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// Paginate through all rows — Supabase caps at 1,000 per request
async function fetchAllActiveWrestlersWithGrade(supabase: ReturnType<typeof db>, select: string) {
  const PAGE = 1000
  const all: Record<string, unknown>[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('wrestlers')
      .select(select)
      .not('grade', 'is', null)
      .eq('is_active', true)
      .eq('is_oos', false)
      .eq('gender', 'M')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// GET — preview: returns counts without committing
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const migrationPending = req.nextUrl.searchParams.get('check') === '1'

  const supabase = db()

  // Check if grade column exists by attempting the query
  const { data, error } = await supabase
    .from('wrestlers')
    .select('id, grade, is_active')
    .not('grade', 'is', null)
    .limit(1)

  if (error && (error.code === '42703' || error.message.includes('grade'))) {
    return NextResponse.json({ migrationPending: true })
  }
  if (migrationPending) return NextResponse.json({ migrationPending: false })

  // Full preview query — paginated to avoid 1,000-row cap
  let wrestlers: Record<string, unknown>[]
  try {
    wrestlers = await fetchAllActiveWrestlersWithGrade(supabase, 'id, first_name, last_name, grade, is_active')
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  // NJ boys wrestlers with no confirmed grade (OOS excluded — they don't have grades)
  const { count: unknownCount } = await supabase
    .from('wrestlers')
    .select('id', { count: 'exact', head: true })
    .is('grade', null)
    .eq('is_active', true)
    .eq('is_oos', false)
    .eq('gender', 'M')

  const rows = wrestlers as { id: string; first_name: string; last_name: string; grade: string; is_active: boolean }[]

  const preview = {
    advancing:  [] as { id: string; name: string; from: string; to: string }[],
    graduating: [] as { id: string; name: string }[],
    unchanged:  unknownCount ?? 0,
  }

  for (const w of rows) {
    const grade = w.grade as Grade
    const next  = nextGrade(grade)
    const name  = `${w.first_name} ${w.last_name}`
    if (next) {
      preview.advancing.push({ id: w.id, name, from: grade, to: next })
    } else {
      preview.graduating.push({ id: w.id, name })
    }
  }

  return NextResponse.json({ preview })
}

// POST — execute the rollover
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()

  // Fetch all confirmed-grade active wrestlers — paginated to avoid 1,000-row cap
  let wrestlerRows: Record<string, unknown>[]
  try {
    wrestlerRows = await fetchAllActiveWrestlersWithGrade(supabase, 'id, grade, is_active')
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const rows = wrestlerRows as { id: string; grade: string }[]

  const toAdvance:  { id: string; grade: Grade }[] = []
  const toGraduate: string[] = []

  for (const w of rows) {
    const grade = w.grade as Grade
    const next  = nextGrade(grade)
    if (next) {
      toAdvance.push({ id: w.id, grade: next })
    } else {
      toGraduate.push(w.id)
    }
  }

  const errors: string[] = []

  // Advance grade for each group (Fr→So, So→Jr, Jr→Sr) in batch
  for (const g of ['So', 'Jr', 'Sr'] as Grade[]) {
    const ids = toAdvance.filter(r => r.grade === g).map(r => r.id)
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('wrestlers')
      .update({ grade: g, grade_confirmed_at: new Date().toISOString(), grade_confirmed_source: 'manual' })
      .in('id', ids)
    if (error) errors.push(`advance to ${g}: ${error.message}`)
  }

  // Graduate seniors
  if (toGraduate.length > 0) {
    const { error } = await supabase
      .from('wrestlers')
      .update({ is_active: false })
      .in('id', toGraduate)
    if (error) errors.push(`graduate: ${error.message}`)
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join('; ') }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'season_rollover',
      p_entity_type: 'wrestlers',
      p_entity_id:   null,
      p_details:     {
        advanced:    toAdvance.length,
        graduated:   toGraduate.length,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok: true,
    advanced:  toAdvance.length,
    graduated: toGraduate.length,
  })
}
