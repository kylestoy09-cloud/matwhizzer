// The "Edit meet" panel's read (Kyle 2026-11-18): one dual's editable fields, admins only — the panel on the public
// meet page asks this and shows nothing to anyone else. Saves go through PATCH /api/admin/dual-meets.
// GET ?id=<meet uuid>   (boys table first, then girls — ids are unique across both)
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = createSupabaseAdmin()
  for (const [gender, meets, matches, deductions] of [['M', 'dual_meets', 'dual_meet_matches', 'dual_meet_deductions'], ['F', 'dual_meets_girls', 'dual_meet_matches_girls', 'dual_meet_deductions_girls']] as const) {
    const { data: m, error } = await db.from(meets).select('*, team1:schools!team1_school_id(display_name), team2:schools!team2_school_id(display_name)').eq('id', id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!m) continue
    const [b, d] = await Promise.all([
      db.from(matches).select('id', { count: 'exact', head: true }).eq('dual_meet_id', id),
      db.from(deductions).select('id', { count: 'exact', head: true }).eq('dual_meet_id', id),
    ])
    const r = m as Record<string, unknown> & { team1?: { display_name: string } | null; team2?: { display_name: string } | null }
    return NextResponse.json({
      meet: {
        id: r.id, gender, meet_date: r.meet_date, meet_time: r.meet_time ?? null,
        away: r.team1?.display_name ?? 'TBD', home: r.team2?.display_name ?? 'TBD',
        stream_url: r.stream_url ?? null, premier_label: r.premier_label ?? null,
        counts_toward_record: gender === 'F' ? r.counts_toward_record !== false : null,
        has_bouts: (b.count ?? 0) + (d.count ?? 0) > 0,
        columns_ready: 'stream_url' in r,   // false until 20261118_meet_stream_and_details.sql is run
      },
    })
  }
  return NextResponse.json({ error: 'Meet not found' }, { status: 404 })
}
