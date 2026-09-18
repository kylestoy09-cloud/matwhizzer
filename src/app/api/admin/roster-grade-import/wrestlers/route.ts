import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()}  `
  const tris = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) tris.add(padded.slice(i, i + 3))
  return tris
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

function nameSimilarity(
  trackFirst: string, trackLast: string,
  liveFirst: string,  liveLast: string,
): number {
  const trackFull = `${trackFirst} ${trackLast}`.toLowerCase().trim()
  const liveFull  = `${liveFirst}  ${liveLast}`.toLowerCase().trim()
  // Exact full name
  if (trackFull === liveFull) return 1.0
  // Last name exact + first name initial
  if (
    trackLast.toLowerCase() === liveLast.toLowerCase() &&
    trackFirst.charAt(0).toLowerCase() === liveFirst.charAt(0).toLowerCase()
  ) return 0.92
  // Last name exact only
  if (trackLast.toLowerCase() === liveLast.toLowerCase()) return 0.80
  // Trigram on full name
  return trigramSimilarity(trackFull, liveFull)
}

// GET — ?school_id=X : Track entries + live wrestlers for this school with match scores
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = Number(req.nextUrl.searchParams.get('school_id'))
  if (!schoolId) return NextResponse.json({ error: 'school_id required' }, { status: 400 })

  const db = createSupabaseAdmin()

  // wrestlers has no school_id column — look up via wrestler_name_aliases
  const [trackRes, aliasRes] = await Promise.all([
    db.from('roster_grade_import')
      .select('id, first_name_raw, last_name_raw, weight_class, grade, status, wrestler_id')
      .eq('school_id', schoolId)
      .in('status', ['school_matched', 'wrestler_matched', 'no_match'])
      .order('last_name_raw'),
    db.from('wrestler_name_aliases')
      .select('wrestler_id')
      .eq('school_id', schoolId),
  ])

  if (trackRes.error)  return NextResponse.json({ error: trackRes.error.message },  { status: 500 })
  if (aliasRes.error)  return NextResponse.json({ error: aliasRes.error.message },  { status: 500 })

  const wrestlerIds = [...new Set((aliasRes.data ?? []).map(r => r.wrestler_id).filter(Boolean))]

  const liveRes = wrestlerIds.length === 0
    ? { data: [], error: null }
    : await db.from('wrestlers')
        .select('id, first_name, last_name, grade, grade_confirmed_source')
        .eq('gender', 'M')
        .eq('is_active', true)
        .eq('is_oos', false)
        .neq('first_name', 'Unknown')
        .in('id', wrestlerIds)
        .order('last_name')

  if (liveRes.error) return NextResponse.json({ error: liveRes.error.message }, { status: 500 })

  const liveWrestlers = liveRes.data ?? []
  const trackEntries  = trackRes.data ?? []

  // For each track entry, score against all live wrestlers
  const entries = trackEntries.map(entry => {
    if (entry.status === 'wrestler_matched' && entry.wrestler_id) {
      const matched = liveWrestlers.find(w => w.id === entry.wrestler_id)
      return { ...entry, matches: [], autoMatch: null, matchedWrestler: matched ?? null }
    }

    const scored = liveWrestlers
      .map(w => ({
        wrestlerId:  w.id,
        displayName: `${w.first_name} ${w.last_name}`,
        currentGrade: w.grade,
        score: nameSimilarity(entry.first_name_raw, entry.last_name_raw, w.first_name, w.last_name),
      }))
      .filter(m => m.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)

    const autoMatch = scored[0]?.score >= 0.85 ? scored[0] : null

    return { ...entry, matches: scored, autoMatch, matchedWrestler: null }
  })

  return NextResponse.json({ entries, liveWrestlers: liveRes.data ?? [], liveCount: (liveRes.data ?? []).length })
}

// PATCH — save wrestler match decisions
// Body: Array<{ id: string; wrestler_id: string | null; status: 'wrestler_matched' | 'no_match' }>
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { id: string; wrestler_id: string | null; status: string }[]
  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const errors: string[] = []

  for (const { id, wrestler_id, status } of body) {
    const { error } = await db
      .from('roster_grade_import')
      .update({ wrestler_id: wrestler_id ?? null, status })
      .eq('id', id)
    if (error) errors.push(`${id}: ${error.message}`)
  }

  if (errors.length > 0) return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  return NextResponse.json({ ok: true, updated: body.length })
}
