import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { TournamentChecklistClient } from './TournamentChecklistClient'

export const dynamic = 'force-dynamic'

// Compares this side's imported in-season tournaments against the schedule entered by
// hand in the Tournament Registry for the season in progress (a preseason step each year).
export type RefTournament = {
  date: string
  name: string
  state: string
  dbId: string | null
  dbName: string | null
}

// Normalize a name for fuzzy matching
function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(20\d\d|19\d\d)\b/g, '')          // strip years
    .replace(/\b\d+(st|nd|rd|th)\s+(annual)?\b/gi, '') // strip "67th annual"
    .replace(/\bannual\b/gi, '')
    .replace(/\b(hs|high school|varsity|boys|girls|wrestling|tournament|invitational|classic|open)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function wordScore(a: string, b: string): number {
  const wa = new Set(norm(a).split(' ').filter(w => w.length > 2))
  const wb = new Set(norm(b).split(' ').filter(w => w.length > 2))
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.max(wa.size, wb.size, 1)
}

export default async function TournamentChecklistPage({ params }: { params: Promise<{ side: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const gender: 'M' | 'F' = (await params).side === 'girls' ? 'F' : 'M'
  const season = (await getWorkingSeason(gender)).label

  const [{ data: registry }, { data: dbTournaments }] = await Promise.all([
    supabase
      .from('tournament_registry')
      .select('name, date_start, state')
      .eq('season', season)
      .in('gender', [gender, 'both'])
      .order('date_start', { ascending: false }),
    supabase
      .from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')
      .select('id, name, start_date, end_date')
      .eq('season', season)
      .order('start_date'),
  ])

  const db = dbTournaments ?? []
  const reference = ((registry ?? []) as { name: string; date_start: string | null; state: string | null }[])
    .filter(r => r.date_start)

  // Match each registry entry against the imported tournaments
  const matched: RefTournament[] = reference.map(ref => {
    let bestId: string | null = null
    let bestName: string | null = null
    let bestScore = 0

    for (const t of db) {
      const dateDiff = Math.abs(
        new Date(ref.date_start!).getTime() - new Date(t.start_date).getTime()
      ) / 86_400_000  // days

      if (dateDiff > 4) continue  // too far apart in time

      const score = wordScore(ref.name, t.name) - dateDiff * 0.05
      if (score > bestScore && score > 0.3) {
        bestScore = score
        bestId = t.id
        bestName = t.name
      }
    }

    return { date: ref.date_start!, name: ref.name, state: ref.state ?? '', dbId: bestId, dbName: bestName }
  })

  return (
    <TournamentChecklistClient
      tournaments={matched}
      totalInDb={matched.filter(m => m.dbId).length}
      totalMissing={matched.filter(m => !m.dbId).length}
      title={`${gender === 'F' ? 'Girls' : 'Boys'} ${season}`}
      registryHref={`/admin/${gender === 'F' ? 'girls' : 'boys'}/tournament-registry`}
    />
  )
}
