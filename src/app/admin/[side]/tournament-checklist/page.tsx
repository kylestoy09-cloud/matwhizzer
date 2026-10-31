import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TournamentChecklistClient } from './TournamentChecklistClient'

export const dynamic = 'force-dynamic'

// Historical record: the reference list below is the 2025-26 schedule, so this page is pinned to
// that season on purpose. It does not roll over. Use the Tournament Registry for the current season.
const CHECKLIST_SEASON = '2025-26' // season-literal-ok: pinned historical record

// Reference list of expected in-season tournaments for CHECKLIST_SEASON.
// Names here are the raw source names (not necessarily exact DB names).
// Duplicates in the source list are preserved so the match UI can flag them.
// season-literal-ok-start: pinned 2025-26 reference schedule
const REFERENCE_TOURNAMENTS = [
  { date: '2026-02-14', name: 'Escape Gloucester County Cell Block 6', state: 'NJ' },
  { date: '2026-02-07', name: 'Panther Open at William Tennent', state: 'PA' },
  { date: '2026-01-31', name: 'CVC Championships', state: 'NJ' },
  { date: '2026-01-31', name: 'WSAZ Invitational', state: 'WV' },
  { date: '2026-01-25', name: 'Skyland Conference Novice', state: 'NJ' },
  { date: '2026-01-24', name: 'Passaic County Coaches Tournament', state: 'NJ' },
  { date: '2026-01-24', name: 'Greater Middlesex Conference Tournament', state: 'NJ' },
  { date: '2026-01-24', name: 'Shore Conference Individual Tournament', state: 'NJ' },
  { date: '2026-01-24', name: 'Morris County Tournament', state: 'NJ' },
  { date: '2026-01-24', name: 'Burlington County Tournament', state: 'NJ' },
  { date: '2026-01-22', name: 'Essex County Tournament', state: 'NJ' },
  { date: '2026-01-19', name: 'Schulman Scuffle', state: 'NJ' },
  { date: '2026-01-19', name: 'Immaculata', state: 'NJ' },
  { date: '2026-01-18', name: 'BCCA George Jockish Wrestling Tournament', state: 'NJ' },
  { date: '2026-01-18', name: 'Escape the Rock', state: 'PA' },
  { date: '2026-01-17', name: 'Union County Conference Tournament', state: 'NJ' },
  { date: '2026-01-17', name: 'SCIAA Somerset County Tournament', state: 'NJ' },
  { date: '2026-01-17', name: 'Penn Charter Invitational', state: 'PA' },
  { date: '2026-01-10', name: 'Battle at the Brook', state: 'NJ' },
  { date: '2026-01-10', name: 'Buc Classic', state: 'NJ' },
  { date: '2026-01-10', name: 'Belleville Buccaneer Classic', state: 'NJ' },
  { date: '2026-01-10', name: 'Hunterdon/Warren/Sussex', state: 'NJ' },
  { date: '2026-01-10', name: 'John Gorman Invitational', state: 'RI' },
  { date: '2026-01-10', name: 'Doc Buchanan Invitational', state: 'CA' },
  { date: '2026-01-10', name: 'East Coast Catholic Classic', state: 'VA' },
  { date: '2026-01-10', name: 'Eastern States Classic', state: 'NY' },
  { date: '2026-01-03', name: 'Minuteman Classic', state: 'NJ' },
  { date: '2026-01-03', name: 'Pioneer Classic', state: 'NJ' },
  { date: '2026-01-03', name: 'Hammonton Blue Devil Duals', state: 'NJ' },
  { date: '2025-12-30', name: 'Tim Groves Holiday Tournament', state: 'NJ' },
  { date: '2025-12-30', name: 'East Brunswick Bear Invitational', state: 'NJ' },
  { date: '2025-12-30', name: 'Elmwood Park Crusader Classic', state: 'NJ' },
  { date: '2025-12-30', name: 'Powerade', state: 'PA' },
  { date: '2025-12-30', name: 'King of the Castle', state: 'DE' },
  { date: '2025-12-29', name: 'John Goles Tournament', state: 'NJ' },
  { date: '2025-12-29', name: 'Overbrook Holiday Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-29', name: 'Rahway Holiday Tournament', state: 'NJ' },
  { date: '2025-12-29', name: 'Parsippany Hills Holiday Tournament', state: 'NJ' },
  { date: '2025-12-29', name: 'Bethlehem Holiday Wrestling Classic', state: 'PA' },
  { date: '2025-12-28', name: 'Walter Woods Holiday Tournament', state: 'NJ' },
  { date: '2025-12-28', name: 'Mustang Classic', state: 'NJ' },
  { date: '2025-12-28', name: 'Sam Cali Battle for The Belt', state: 'NJ' },
  { date: '2025-12-28', name: 'Wetzel Holiday Classic', state: 'PA' },
  { date: '2025-12-27', name: 'Marinelli-EHT Varsity Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Dan Allen Clipper Classic', state: 'NJ' },
  { date: '2025-12-27', name: 'Holmdel Holiday Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Linn Crawn Holiday Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Hunterdon Central Invitational', state: 'NJ' },
  { date: '2025-12-27', name: 'Palmyra Panther Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Bart Payne Holiday Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Lenape Valley Tournament', state: 'NJ' },
  { date: '2025-12-27', name: 'Overbrook Holiday Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-21', name: 'Beast of the East', state: 'DE' },
  { date: '2025-12-20', name: 'TCNJ Pride', state: 'NJ' },
  { date: '2025-12-20', name: 'Garden State Classic', state: 'NJ' },
  { date: '2025-12-20', name: 'Kearny Holiday Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Mustang Invitational Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Ron Mazzola Memorial Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Laker Holiday Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Gator Beast Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'A-Nice Invitational', state: 'NJ' },
  { date: '2025-12-20', name: 'Hammonton Kick-Off Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Cutter Classic', state: 'NJ' },
  { date: '2025-12-20', name: 'Morris Knolls Tournament', state: 'NJ' },
  { date: '2025-12-20', name: 'Howdy Duncan', state: 'DE' },
  { date: '2025-12-13', name: 'Frank M. Dawson Jr. Holiday Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Pete Adams Memorial Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Irvington Holiday Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Ricky I Memorial Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Ronald Bond Wrestling Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Dover Holiday Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Central Regional Golden Eagle Classic', state: 'NJ' },
  { date: '2025-12-13', name: 'Mike Dessino Invitational', state: 'NJ' },
  { date: '2025-12-13', name: 'Caldwell Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Harry McLaughlin Invitational', state: 'NJ' },
  { date: '2025-12-13', name: 'Robin Leff Tournament', state: 'NJ' },
  { date: '2025-12-13', name: 'Schalick Classic', state: 'NJ' },
  { date: '2025-12-13', name: 'Ramsey Invitational', state: 'NJ' },
  { date: '2025-12-13', name: 'Wendy Pandy-Leh Wrestling Invitational', state: 'NJ' },
  { date: '2025-12-13', name: 'John and Betty Vogeding', state: 'NJ' },
  { date: '2025-12-13', name: 'Blue Devil Classic', state: 'NJ' },
  { date: '2025-12-13', name: 'Iron Man Tournament', state: 'OH' },
] as const
// season-literal-ok-end

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

  // The reference list is the boys schedule; girls has no reference list yet
  const { side } = await params
  if (side === 'girls') {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-16">
        <h1 className="text-xl font-bold text-slate-900">Tournament Checklist — Girls</h1>
        <p className="mt-3 text-sm text-slate-600">
          This checklist compares the database against a reference list of the season&apos;s tournaments.
          Only a boys list has been provided, so there is no girls checklist yet.
        </p>
      </div>
    )
  }

  const { data: dbTournaments } = await supabase
    .from('in_season_tournaments')
    .select('id, name, start_date, end_date')
    .eq('season', CHECKLIST_SEASON)
    .order('start_date')

  const db = dbTournaments ?? []

  // Match each reference entry against DB tournaments
  const matched: RefTournament[] = REFERENCE_TOURNAMENTS.map(ref => {
    let bestId: string | null = null
    let bestName: string | null = null
    let bestScore = 0

    for (const t of db) {
      const dateDiff = Math.abs(
        new Date(ref.date).getTime() - new Date(t.start_date).getTime()
      ) / 86_400_000  // days

      if (dateDiff > 4) continue  // too far apart in time

      const score = wordScore(ref.name, t.name) - dateDiff * 0.05
      if (score > bestScore && score > 0.3) {
        bestScore = score
        bestId = t.id
        bestName = t.name
      }
    }

    return { ...ref, dbId: bestId, dbName: bestName }
  })

  const inDb = matched.filter(m => m.dbId).length
  const missing = matched.filter(m => !m.dbId).length

  return (
    <TournamentChecklistClient
      tournaments={matched}
      totalInDb={inDb}
      totalMissing={missing}
    />
  )
}
