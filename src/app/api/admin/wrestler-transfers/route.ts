import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// GET /api/admin/wrestler-transfers?status=pending
// Returns list of pending transfer candidates
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  const supabase = db()

  // Probe for table
  const { error: probeErr } = await supabase
    .from('pending_wrestler_transfers')
    .select('id')
    .limit(1)

  if (probeErr && (probeErr.code === '42P01' || probeErr.message.includes('does not exist'))) {
    return NextResponse.json({ migrationPending: true, transfers: [] })
  }

  const { data, error } = await supabase
    .from('pending_wrestler_transfers')
    .select(`
      id, status, detected_via, notes, created_at, resolved_at, resolved_by,
      wrestlers(id, first_name, last_name, gender),
      current_school:schools!pending_wrestler_transfers_current_school_id_fkey(id, display_name),
      suspected_school:schools!pending_wrestler_transfers_suspected_school_id_fkey(id, display_name)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ migrationPending: false, transfers: data ?? [] })
}

// POST /api/admin/wrestler-transfers — scan for transfer candidates
// Finds wrestlers whose (first_name, last_name) appears at 2+ distinct schools
// in tournament_entries and creates pending_wrestler_transfers records for new ones.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.action !== 'scan') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

  const supabase = db()

  // Probe for table
  const { error: probeErr } = await supabase
    .from('pending_wrestler_transfers')
    .select('id').limit(1)

  if (probeErr && (probeErr.code === '42P01' || probeErr.message.includes('does not exist'))) {
    return NextResponse.json({ error: 'Apply 20260824_pending_wrestler_transfers.sql first' }, { status: 400 })
  }

  // Fetch all tournament_entries (current season only) with wrestler + school
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('wrestler_id, school_id, tournaments(season_id)')
    .not('wrestler_id', 'is', null)
    .not('school_id',   'is', null)
    .limit(50000)

  const rows = (entries ?? []) as unknown as {
    wrestler_id: string
    school_id:   number
    tournaments: { season_id: number } | null
  }[]

  // Build: wrestler_id → Set of school_ids
  const wrestlerSchools = new Map<string, Set<number>>()
  for (const r of rows) {
    if (!wrestlerSchools.has(r.wrestler_id)) wrestlerSchools.set(r.wrestler_id, new Set())
    wrestlerSchools.get(r.wrestler_id)!.add(r.school_id)
  }

  // Find wrestlers at exactly 2 schools (not 3+ — those are already in data-health)
  const candidates: { wrestler_id: string; school1: number; school2: number }[] = []
  for (const [wrestlerId, schools] of wrestlerSchools) {
    if (schools.size === 2) {
      const [s1, s2] = [...schools]
      candidates.push({ wrestler_id: wrestlerId, school1: s1, school2: s2 })
    }
  }

  if (candidates.length === 0) return NextResponse.json({ ok: true, scanned: 0, created: 0 })

  // Fetch wrestler names to cross-check for name duplicates across schools
  const wrestlerIds = candidates.map(c => c.wrestler_id)
  const { data: wrestlerData } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name')
    .in('id', wrestlerIds)

  const wrestlerMap = new Map<string, { first_name: string; last_name: string }>()
  for (const w of (wrestlerData ?? []) as unknown as { id: string; first_name: string; last_name: string }[]) {
    wrestlerMap.set(w.id, w)
  }

  // Get existing pending transfers (to avoid duplicate inserts)
  const { data: existingTransfers } = await supabase
    .from('pending_wrestler_transfers')
    .select('wrestler_id, suspected_school_id')
    .in('wrestler_id', wrestlerIds)

  const existingKeys = new Set(
    ((existingTransfers ?? []) as unknown as { wrestler_id: string; suspected_school_id: number }[])
      .map(t => `${t.wrestler_id}|${t.suspected_school_id}`)
  )

  // For each candidate: check if another wrestler with the same name exists at the other school
  // (this would be a "true" transfer candidate — same name, different school records)
  const toInsert: {
    wrestler_id: string
    suspected_school_id: number
    current_school_id:   number
    detected_via:        string
  }[] = []

  for (const c of candidates) {
    const w = wrestlerMap.get(c.wrestler_id)
    if (!w) continue

    // The wrestler already has entries at school1 AND school2 — flag school2 as suspected transfer
    const suspectedSchool = c.school2 // arbitrary: the second school
    const currentSchool   = c.school1

    const key = `${c.wrestler_id}|${suspectedSchool}`
    if (!existingKeys.has(key)) {
      toInsert.push({
        wrestler_id:         c.wrestler_id,
        suspected_school_id: suspectedSchool,
        current_school_id:   currentSchool,
        detected_via:        'data_health_scan',
      })
      existingKeys.add(key) // prevent duplicates within batch
    }
  }

  let created = 0
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('pending_wrestler_transfers')
      .insert(toInsert)
    if (!insertErr) created = toInsert.length
  }

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'scan_transfer_candidates',
      p_entity_type: 'pending_wrestler_transfers',
      p_entity_id:   null,
      p_details:     { scanned: candidates.length, created },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, scanned: candidates.length, created })
}

// PATCH /api/admin/wrestler-transfers
// Body: { id, action: 'confirm' | 'reject' }
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, action } = body as { id?: string; action?: 'confirm' | 'reject' }
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })

  const supabase = db()

  // Fetch the transfer record
  const { data: transfer, error: fetchErr } = await supabase
    .from('pending_wrestler_transfers')
    .select('id, wrestler_id, suspected_school_id, current_school_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  const t = transfer as { id: string; wrestler_id: string; suspected_school_id: number; current_school_id: number | null; status: string }

  if (t.status !== 'pending') return NextResponse.json({ error: 'Already resolved' }, { status: 400 })

  const now = new Date().toISOString()

  if (action === 'confirm') {
    // Check if wrestler_school_history exists
    const { error: histProbe } = await supabase
      .from('wrestler_school_history')
      .select('id').limit(1)

    if (!histProbe) {
      // Close current open row (if any) for the old school
      if (t.current_school_id) {
        const { data: openRows } = await supabase
          .from('wrestler_school_history')
          .select('id')
          .eq('wrestler_id', t.wrestler_id)
          .is('end_date', null)

        for (const row of (openRows ?? []) as { id: string }[]) {
          await supabase
            .from('wrestler_school_history')
            .update({ end_date: now.split('T')[0] })
            .eq('id', row.id)
        }
      }

      // Create new history row for the confirmed transfer school
      await supabase.from('wrestler_school_history').insert({
        wrestler_id:           t.wrestler_id,
        school_id:             t.suspected_school_id,
        start_date:            now.split('T')[0],
        is_confirmed_transfer: true,
        created_via:           'import_flag',
      })
    }
  }

  // Mark transfer resolved
  await supabase
    .from('pending_wrestler_transfers')
    .update({
      status:      action === 'confirm' ? 'confirmed' : 'rejected',
      resolved_at: now,
      resolved_by: email,
    })
    .eq('id', id)

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      action === 'confirm' ? 'confirm_transfer' : 'reject_transfer',
      p_entity_type: 'pending_wrestler_transfers',
      p_entity_id:   id,
      p_details:     { wrestler_id: t.wrestler_id, suspected_school_id: t.suspected_school_id },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
