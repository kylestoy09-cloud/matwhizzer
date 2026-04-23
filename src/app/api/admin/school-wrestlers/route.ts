// ─────────────────────────────────────────────────────────────────────────────
// school-wrestlers/route.ts
// Returns all wrestlers on file for a given school, with their weight classes.
// Used by the inline wrestler review panel when no fuzzy candidates exist.
//
// GET /api/admin/school-wrestlers?schoolId=42
// Response: { wrestlers: SchoolWrestler[] }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type EntryRow = {
  wrestler_id:   string
  wrestlers:     { id: string; first_name: string; last_name: string; suffix: string | null } | null
  weight_classes: { weight: number } | null
}

export type SchoolWrestler = {
  wrestlerId:  string
  displayName: string
  weights:     number[]   // sorted asc
}

function buildName(w: { first_name: string; last_name: string; suffix: string | null }): string {
  const base = `${w.first_name} ${w.last_name}`
  return w.suffix ? `${base} ${w.suffix}` : base
}

export async function GET(req: NextRequest) {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = parseInt(req.nextUrl.searchParams.get('schoolId') ?? '')
  if (isNaN(schoolId)) {
    return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data, error } = await supabase
    .from('tournament_entries')
    .select('wrestler_id, wrestlers(id, first_name, last_name, suffix), weight_classes(weight)')
    .eq('school_id', schoolId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by wrestler_id, accumulate weights
  const map = new Map<string, SchoolWrestler>()
  for (const row of (data ?? []) as unknown as EntryRow[]) {
    const w = row.wrestlers
    if (!w) continue
    const weight = row.weight_classes?.weight
    if (weight === undefined) continue

    const existing = map.get(row.wrestler_id)
    if (existing) {
      if (!existing.weights.includes(weight)) existing.weights.push(weight)
    } else {
      map.set(row.wrestler_id, {
        wrestlerId:  w.id,
        displayName: buildName(w),
        weights:     [weight],
      })
    }
  }

  // Sort weights within each wrestler, then sort roster by last name
  const wrestlers = [...map.values()]
    .map(w => ({ ...w, weights: [...w.weights].sort((a, b) => a - b) }))
    .sort((a, b) => {
      const la = a.displayName.split(' ').at(-1) ?? ''
      const lb = b.displayName.split(' ').at(-1) ?? ''
      return la.localeCompare(lb)
    })

  return NextResponse.json({ wrestlers })
}
