import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseTeamScoreBlock } from '@/lib/parseRtf'
import { matchSchoolNames } from '@/lib/matchSchools'
import { seasonIdForDate } from '@/lib/seasons'
import { isAdminUser } from '@/lib/auth/isAdminUser'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminUser(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { text, tournament_query, gender } = await req.json()

  const rawScores = parseTeamScoreBlock(text ?? '')
  if (!rawScores.length) {
    return NextResponse.json({ error: 'No team scores found — check the format' }, { status: 400 })
  }

  const client = serviceClient()
  const query = (tournament_query ?? '').trim()
  const [{ data: boysTournaments }, { data: girlsTournaments }] = await Promise.all([
    client.from('in_season_tournaments').select('id, name, start_date, season').ilike('name', `%${query}%`).order('start_date', { ascending: false }).limit(6),
    client.from('in_season_tournaments_girls').select('id, name, start_date, season').ilike('name', `%${query}%`).order('start_date', { ascending: false }).limit(6),
  ])
  // gender (M/F) limits the match to that side's tournaments
  const tournaments = [
    ...(gender === 'F' ? [] : (boysTournaments ?? []).map(t => ({ ...t, gender: 'M' as const }))),
    ...(gender === 'M' ? [] : (girlsTournaments ?? []).map(t => ({ ...t, gender: 'F' as const }))),
  ]
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
    .slice(0, 6)

  // Match against the best-matching tournament's gender and season, so co-op
  // member names resolve to that season's program. No tournament found → any season.
  const best = tournaments[0]
  const matchOpts = best?.start_date ? { gender: best.gender, seasonId: seasonIdForDate(best.start_date) } : undefined

  // The tournament's own bouts say which school a printed name is (Kyle 2026-11-20: Powerade's "Franklin Regional" and
  // "Williamstown" were taken as the NJ schools by name alone). A name its bouts use takes that school; at an
  // out-of-state tournament, an NJ school none of whose wrestlers are in its bouts is only a guess.
  const fromBouts = new Map<string, number>(), boutSchools = new Set<number>()
  let outside = false
  if (best) {
    const tt = best.gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', bt = best.gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
    const { data: t } = await client.from(tt).select('is_oos, tournament_type').eq('id', best.id).maybeSingle()
    outside = !!t?.is_oos || t?.tournament_type === 'outside'
    for (let f = 0; ; f += 1000) {
      const { data } = await client.from(bt).select('wrestler1_school_raw, wrestler1_school_id, wrestler2_school_raw, wrestler2_school_id').eq('in_season_tournament_id', best.id).order('id').range(f, f + 999)
      for (const b of data ?? []) for (const [raw, id] of [[b.wrestler1_school_raw, b.wrestler1_school_id], [b.wrestler2_school_raw, b.wrestler2_school_id]] as [string | null, number | null][]) {
        if (id == null) continue
        boutSchools.add(id)
        if (raw) fromBouts.set(raw.trim().toLowerCase(), id)
      }
      if (!data || data.length < 1000) break
    }
  }
  const { data: njRows } = await client.from('schools').select('id').eq('is_nj', true)
  const njIds = new Set((njRows ?? []).map(x => x.id))

  const scores = await Promise.all(rawScores.map(async s => {
    const m = await matchSchoolNames(s.school_name, matchOpts)
    const boutId = fromBouts.get(s.school_name.trim().toLowerCase())
    if (boutId != null) {
      const { data: sc } = await client.from('schools').select('display_name').eq('id', boutId).maybeSingle()
      return { place: s.place, school_name: s.school_name, score: s.score, school_id: boutId, display_name: sc?.display_name ?? null, confidence: 'exact' as const,
        alternates: m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score })) }
    }
    const unproven = outside && m.schoolId != null && njIds.has(m.schoolId) && !boutSchools.has(m.schoolId)
    return {
      place: s.place,
      school_name: s.school_name,
      score: s.score,
      school_id: unproven ? null : m.schoolId,
      display_name: m.displayName,
      confidence: unproven ? 'low' as const : m.confidence,
      alternates: [
        ...(unproven ? [{ school_id: m.schoolId!, display_name: `${m.displayName} (NJ — no wrestlers in this tournament's bouts)`, score: 0 }] : []),
        ...m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score })),
      ],
    }
  }))

  return NextResponse.json({ scores, tournaments })
}
