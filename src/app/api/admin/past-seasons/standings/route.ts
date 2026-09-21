import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: null }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: null }
  return { user, email: user.email ?? '' }
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

type StandingsPayload = {
  schoolId: number
  schoolName: string
  division: string
  overallWins: number
  overallLosses: number
  divWins: number | null
  divLosses: number | null
  pf: number | null
  pa: number | null
}

type PowerPointsPayload = {
  schoolId: number
  wins: number
  losses: number
  pp: number
}

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)
const isIntOrNull = (v: unknown): v is number | null => v === null || isInt(v)

// GET ?seasonId=&gender= → conferences and how many standings rows each already has
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params   = req.nextUrl.searchParams
  const seasonId = parseInt(params.get('seasonId') ?? '', 10)
  const gender   = params.get('gender')
  if (!Number.isInteger(seasonId) || (gender !== 'M' && gender !== 'F')) {
    return NextResponse.json({ error: 'seasonId and gender are required' }, { status: 400 })
  }

  const client = db()
  const [{ data: conferences, error: confErr }, { data: existing, error: existErr }] = await Promise.all([
    client.from('conferences').select('slug, name').order('name'),
    client.from('conference_standings').select('conference_slug').eq('season_id', seasonId).eq('gender', gender),
  ])
  if (confErr)   return NextResponse.json({ error: confErr.message }, { status: 500 })
  if (existErr)  return NextResponse.json({ error: existErr.message }, { status: 500 })

  const existingCounts: Record<string, number> = {}
  for (const r of existing ?? []) existingCounts[r.conference_slug] = (existingCounts[r.conference_slug] ?? 0) + 1

  return NextResponse.json({ conferences: conferences ?? [], existingCounts })
}

// POST { kind: 'standings' | 'power_points', seasonId, gender, ... }
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { kind, seasonId, gender, rawText } = (body ?? {}) as {
    kind?: string; seasonId?: number; gender?: string; rawText?: string
  }
  if (!isInt(seasonId) || (gender !== 'M' && gender !== 'F') || (kind !== 'standings' && kind !== 'power_points')) {
    return NextResponse.json({ error: 'kind, seasonId and gender are required' }, { status: 400 })
  }

  const client = db()
  const { data: season } = await client.from('seasons').select('id').eq('id', seasonId).maybeSingle()
  if (!season) return NextResponse.json({ error: `Unknown season ${seasonId}` }, { status: 400 })

  if (kind === 'standings') {
    const { conferenceSlug, rows } = body as { conferenceSlug?: string; rows?: StandingsPayload[] }
    if (!conferenceSlug || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'conferenceSlug and rows are required' }, { status: 400 })
    }
    const valid = rows.every(r =>
      isInt(r.schoolId) && typeof r.schoolName === 'string' && r.schoolName.trim() !== '' &&
      typeof r.division === 'string' && isInt(r.overallWins) && isInt(r.overallLosses) &&
      isIntOrNull(r.divWins) && isIntOrNull(r.divLosses) && isIntOrNull(r.pf) && isIntOrNull(r.pa))
    if (!valid) return NextResponse.json({ error: 'Invalid standings rows' }, { status: 400 })

    const seen = new Set<number>()
    for (const r of rows) {
      if (seen.has(r.schoolId)) {
        return NextResponse.json({ error: `School ${r.schoolName} appears twice in this conference` }, { status: 400 })
      }
      seen.add(r.schoolId)
    }

    const { data: conf } = await client.from('conferences').select('slug').eq('slug', conferenceSlug).maybeSingle()
    if (!conf) return NextResponse.json({ error: `Unknown conference ${conferenceSlug}` }, { status: 400 })

    // Insert first, then remove the old rows — a failed insert leaves existing data untouched
    const { data: old, error: oldErr } = await client
      .from('conference_standings')
      .select('id')
      .eq('season_id', seasonId).eq('gender', gender).eq('conference_slug', conferenceSlug)
    if (oldErr) return NextResponse.json({ error: oldErr.message }, { status: 500 })

    const { error: insErr } = await client.from('conference_standings').insert(
      rows.map(r => ({
        conference_slug: conferenceSlug,
        division:        r.division,
        school_id:       r.schoolId,
        school_name:     r.schoolName.trim(),
        season_id:       seasonId,
        gender,
        overall_wins:    r.overallWins,
        overall_losses:  r.overallLosses,
        div_wins:        r.divWins,
        div_losses:      r.divLosses,
        pf:              r.pf,
        pa:              r.pa,
      })),
    )
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    const oldIds = (old ?? []).map(r => r.id as number)
    if (oldIds.length > 0) {
      const { error: delErr } = await client.from('conference_standings').delete().in('id', oldIds)
      if (delErr) {
        return NextResponse.json({
          error: `Imported ${rows.length} rows but could not remove ${oldIds.length} old rows: ${delErr.message}`,
        }, { status: 500 })
      }
    }

    await logActivity(client, email, 'import_standings', { seasonId, gender, conferenceSlug, imported: rows.length, replaced: oldIds.length, rawText })
    return NextResponse.json({ ok: true, imported: rows.length, replaced: oldIds.length })
  }

  const { rows } = body as { rows?: PowerPointsPayload[] }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'rows are required' }, { status: 400 })
  }
  const valid = rows.every(r => isInt(r.schoolId) && isInt(r.wins) && isInt(r.losses) && typeof r.pp === 'number' && Number.isFinite(r.pp))
  if (!valid) return NextResponse.json({ error: 'Invalid power points rows' }, { status: 400 })

  const byId = new Map<number, PowerPointsPayload>()
  for (const r of rows) byId.set(r.schoolId, r)
  const finalRows = [...byId.values()]
  const schoolIds = finalRows.map(r => r.schoolId)

  const { data: old, error: oldErr } = await client
    .from('power_points')
    .select('*')
    .eq('season_id', seasonId).eq('gender', gender).in('school_id', schoolIds)
  if (oldErr) return NextResponse.json({ error: oldErr.message }, { status: 500 })

  // A frozen season locks the displayed PP (every reader takes
  // frozen_power_points ?? power_points). Re-importing must not silently drop
  // that lock, so carry each school's frozen value onto its replacement row.
  const frozenBySchool = new Map<number, number | null>(
    (old ?? []).map(r => [r.school_id as number, (r.frozen_power_points ?? null) as number | null]),
  )
  const frozenKept = [...frozenBySchool.values()].filter(v => v !== null).length

  if ((old ?? []).length > 0) {
    const { error: delErr } = await client.from('power_points').delete().in('id', (old ?? []).map(r => r.id as number))
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  const { error: insErr } = await client.from('power_points').insert(
    finalRows.map(r => ({
      school_id:      r.schoolId,
      season_id:      seasonId,
      gender,
      power_points:   r.pp,
      overall_wins:   r.wins,
      overall_losses: r.losses,
      // NJSIAA counts at most 9 opponents; compute_power_points.mts writes
      // min(unique opponents, 9). A paste has no opponent list, so cap the
      // meet count the same way rather than storing the full schedule length.
      meets_counted:  Math.min(r.wins + r.losses, 9),
      frozen_power_points: frozenBySchool.get(r.schoolId) ?? null,
    })),
  )
  if (insErr) {
    if ((old ?? []).length > 0) await client.from('power_points').insert(old)
    return NextResponse.json({ error: `${insErr.message} (previous values restored)` }, { status: 500 })
  }

  await logActivity(client, email, 'import_power_points', { seasonId, gender, imported: finalRows.length, replaced: (old ?? []).length, frozenKept, rawText })
  return NextResponse.json({ ok: true, imported: finalRows.length, replaced: (old ?? []).length, frozenKept })
}

async function logActivity(client: ReturnType<typeof db>, email: string, action: string, details: Record<string, unknown>) {
  try {
    await client.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      action,
      p_entity_type: action === 'import_standings' ? 'conference_standings' : 'power_points',
      p_entity_id:   null,
      p_details:     details,
    })
  } catch { /* non-fatal */ }
}
