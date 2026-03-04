import { supabase, ROUND_ORDER, ROUND_LABEL, TOURNAMENT_TYPE_LABEL } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type TournamentInfo  = { name: string; tournament_type: string; season_id: number }
type WeightClassInfo = { weight: number }

type Match = {
  id: string
  round: string | null
  bracket_side: string | null
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  winner_entry_id: string | null
  loser_entry_id: string | null
  winner_context_raw: string | null
  // Supabase may return nested joins as object or array depending on inference
  tournament: TournamentInfo | TournamentInfo[] | null
  weight_class: WeightClassInfo | WeightClassInfo[] | null
}

function unwrap<T>(v: T | T[] | null): T | null {
  if (v == null) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

type MatchGroup = {
  tournament_name: string
  tournament_type: string
  weight: number
  season_id: number
  matches: (Match & { result: 'W' | 'L'; opponent: string; opponentSchool: string | null; opponentId: string | null })[]
}

const SEASON_LABELS: Record<number, string> = {
  1: '2024–25',
  2: '2025–26',
}

// Sort order for tournament types within a season
const TOURNAMENT_TYPE_ORDER: Record<string, number> = {
  districts:    0,
  regions:      1,
  girls_regions: 1,
  boys_state:   2,
  girls_state:  2,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatScore(m: Match, isWinner: boolean): string {
  if (m.win_type === 'FALL') {
    if (m.fall_time_seconds) {
      const min = Math.floor(m.fall_time_seconds / 60)
      const sec = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `Fall ${min}:${sec}`
    }
    return 'Fall'
  }
  if (m.win_type === 'TF' || m.win_type === 'TF-1.5') {
    const w = m.winner_score ?? '?'
    const l = m.loser_score ?? '?'
    const score = `${m.win_type} ${isWinner ? w : l}-${isWinner ? l : w}`
    if (m.fall_time_seconds) {
      const min = Math.floor(m.fall_time_seconds / 60)
      const sec = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `${score} ${min}:${sec}`
    }
    return score
  }
  if (m.winner_score != null && m.loser_score != null &&
      (m.winner_score > 0 || m.loser_score > 0)) {
    return isWinner
      ? `${m.winner_score}-${m.loser_score}`
      : `${m.loser_score}-${m.winner_score}`
  }
  return m.win_type ?? ''
}

function tournamentTypeColor(tt: string): string {
  switch (tt) {
    case 'districts':    return 'bg-amber-100 text-amber-800'
    case 'regions':      return 'bg-emerald-100 text-emerald-800'
    case 'boys_state':   return 'bg-blue-100 text-blue-800'
    case 'girls_regions':return 'bg-purple-100 text-purple-800'
    case 'girls_state':  return 'bg-pink-100 text-pink-800'
    default:             return 'bg-slate-100 text-slate-700'
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WrestlerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 1. Wrestler
  const { data: wrestler } = await supabase
    .from('wrestlers')
    .select('id, first_name, last_name, gender, suffix')
    .eq('id', id)
    .single()

  if (!wrestler) notFound()

  // 2. All entries for this wrestler (include school, grade, and season via tournament join)
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('id, school_context_raw, grade_label, tournament:tournaments(season_id)')
    .eq('wrestler_id', id)

  const entryIds = (entries ?? []).map((e: { id: string }) => e.id)

  if (entryIds.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <BackLink gender={wrestler.gender} />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {wrestler.first_name} {wrestler.last_name}
        </h2>
        <p className="text-slate-500">No match records found.</p>
      </div>
    )
  }

  // Determine the current (latest) season this wrestler has entries in
  type EntryRow = {
    id: string
    school_context_raw: string | null
    grade_label: string | null
    tournament: { season_id: number } | { season_id: number }[] | null
  }
  const typedEntries = (entries ?? []) as unknown as EntryRow[]
  const entrySeasons = typedEntries.map(
    e => (unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0
  )
  const currentSeason = entrySeasons.length > 0 ? Math.max(...entrySeasons) : 1

  // School and grade: prefer current season entries, fall back to any
  const currentEntries = typedEntries.filter(
    e => ((unwrap(e.tournament) as { season_id: number } | null)?.season_id ?? 0) === currentSeason
  )
  const primarySchool =
    currentEntries.find(e => e.school_context_raw)?.school_context_raw ??
    typedEntries.find(e => e.school_context_raw)?.school_context_raw ?? null
  const primaryGrade =
    currentEntries.find(e => e.grade_label)?.grade_label ??
    typedEntries.find(e => e.grade_label)?.grade_label ?? null

  // 3. Matches as winner + matches as loser (parallel), plus school name lookup
  const selectFields = `
    id, round, bracket_side, win_type,
    winner_score, loser_score, fall_time_seconds,
    winner_entry_id, loser_entry_id, winner_context_raw,
    tournament:tournaments(name, tournament_type, season_id),
    weight_class:weight_classes(weight)
  `

  const [{ data: winMatches }, { data: lossMatches }, { data: schoolNameRow }] = await Promise.all([
    supabase.from('matches').select(selectFields).in('winner_entry_id', entryIds),
    supabase.from('matches').select(selectFields).in('loser_entry_id', entryIds),
    primarySchool
      ? supabase.from('school_names').select('school_name').eq('abbreviation', primarySchool).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const displaySchool = (schoolNameRow as { school_name: string } | null)?.school_name ?? primarySchool

  // Deduplicate (a match won't appear in both, but be safe)
  const seen = new Set<string>()
  const allMatches: Match[] = []
  for (const m of [...(winMatches ?? []), ...(lossMatches ?? [])]) {
    if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m as unknown as Match) }
  }

  // 4. Opponent names — look up the other side's entry → wrestler
  const opponentEntryIds = [
    ...new Set(
      allMatches.flatMap(m => [m.winner_entry_id, m.loser_entry_id])
        .filter((eid): eid is string => eid != null && !entryIds.includes(eid))
    )
  ]

  const opponentMap: Record<string, { name: string; school: string | null; wrestlerId: string | null }> = {}
  if (opponentEntryIds.length > 0) {
    const { data: oppEntries } = await supabase
      .from('tournament_entries')
      .select('id, school_context_raw, wrestler:wrestlers(id, first_name, last_name)')
      .in('id', opponentEntryIds)

    type OppEntry = { id: string; school_context_raw: string | null; wrestler: { id: string; first_name: string; last_name: string } | { id: string; first_name: string; last_name: string }[] | null }

    // Batch-lookup full school names for all opponent abbreviations
    const oppSchoolAbbrs = new Set<string>()
    for (const e of (oppEntries ?? []) as unknown as OppEntry[]) {
      if (e.school_context_raw) oppSchoolAbbrs.add(e.school_context_raw)
    }
    const schoolNameMap: Record<string, string> = {}
    if (oppSchoolAbbrs.size > 0) {
      const { data: schoolRows } = await supabase
        .from('school_names')
        .select('abbreviation, school_name')
        .in('abbreviation', [...oppSchoolAbbrs])
      for (const row of (schoolRows ?? []) as { abbreviation: string; school_name: string }[]) {
        schoolNameMap[row.abbreviation] = row.school_name
      }
    }

    for (const e of (oppEntries ?? []) as unknown as OppEntry[]) {
      const w = unwrap(e.wrestler)
      const name = w ? `${w.first_name} ${w.last_name}`.trim() : '—'
      const abbr = e.school_context_raw
      opponentMap[e.id] = { name, school: abbr ? (schoolNameMap[abbr] ?? abbr) : null, wrestlerId: w?.id ?? null }
    }
  }

  // 5. Annotate each match with result + opponent name
  const entrySet = new Set(entryIds)
  const annotated = allMatches.map(m => {
    const isWinner = m.winner_entry_id != null && entrySet.has(m.winner_entry_id)
    const opponentEntryId = isWinner ? m.loser_entry_id : m.winner_entry_id
    const isBye = m.win_type == null && m.loser_entry_id == null
    const oppData = opponentEntryId ? opponentMap[opponentEntryId] : null
    const opponent = isBye
      ? 'Bye'
      : (oppData?.name ?? m.winner_context_raw ?? '—')
    const opponentSchool = isBye ? null : (oppData?.school ?? null)
    const opponentId = isBye ? null : (oppData?.wrestlerId ?? null)
    return { ...m, result: (isWinner ? 'W' : 'L') as 'W' | 'L', opponent, opponentSchool, opponentId }
  })

  // 6. Group by season + tournament + weight
  const groups = new Map<string, MatchGroup>()
  for (const m of annotated) {
    const t      = unwrap(m.tournament)
    const wc     = unwrap(m.weight_class)
    const tname  = t?.name ?? 'Unknown'
    const ttype  = t?.tournament_type ?? ''
    const weight = wc?.weight ?? 0
    const seasonId = t?.season_id ?? 1
    const key = `${seasonId}||${tname}||${weight}`
    if (!groups.has(key)) {
      groups.set(key, { tournament_name: tname, tournament_type: ttype, weight, season_id: seasonId, matches: [] })
    }
    groups.get(key)!.matches.push(m)
  }

  // Sort matches within each group by round order
  for (const g of groups.values()) {
    g.matches.sort((a, b) =>
      (ROUND_ORDER[a.round ?? ''] ?? 99) - (ROUND_ORDER[b.round ?? ''] ?? 99)
    )
  }

  // All groups sorted: districts → regions → state, then by tournament name, then weight
  const allGroupsSorted = [...groups.values()].sort((a, b) => {
    const typeOrder =
      (TOURNAMENT_TYPE_ORDER[a.tournament_type] ?? 9) -
      (TOURNAMENT_TYPE_ORDER[b.tournament_type] ?? 9)
    if (typeOrder !== 0) return typeOrder
    return a.tournament_name.localeCompare(b.tournament_name) || a.weight - b.weight
  })

  // Bucket by season, seasons in descending order (latest first)
  const seasonIds = [...new Set(allGroupsSorted.map(g => g.season_id))].sort((a, b) => b - a)
  const bySeason = new Map<number, MatchGroup[]>()
  for (const g of allGroupsSorted) {
    if (!bySeason.has(g.season_id)) bySeason.set(g.season_id, [])
    bySeason.get(g.season_id)!.push(g)
  }

  // Current-season stats for the profile header
  const currentGroups = bySeason.get(currentSeason) ?? []
  const currentAnnotated = annotated.filter(
    m => (unwrap(m.tournament)?.season_id ?? 1) === currentSeason
  )
  const wins   = currentAnnotated.filter(m => m.result === 'W').length
  const losses = currentAnnotated.filter(m => m.result === 'L').length

  // Primary weight from current season
  const currentWeights = currentGroups.map(g => g.weight).filter(w => w > 0)
  const primaryWeight = currentWeights.length > 0 ? Math.min(...currentWeights) : null

  // District and region labels from current season
  const districtNames = [...new Set(
    currentGroups
      .filter(g => g.tournament_type === 'districts')
      .map(g => { const m = g.tournament_name.match(/District (\d+)$/); return m ? `D${m[1]}` : null })
      .filter((x): x is string => x !== null)
  )].sort()

  const regionNames = [...new Set(
    currentGroups
      .filter(g => g.tournament_type === 'regions' || g.tournament_type === 'girls_regions')
      .map(g => {
        const mBoys = g.tournament_name.match(/Regions r(\d+)$/i)
        if (mBoys) return `R${mBoys[1]}`
        const mGirls = g.tournament_name.match(/Regions (.+)$/)
        if (mGirls) return mGirls[1]
        return null
      })
      .filter((x): x is string => x !== null)
  )].sort()

  const displayName = [wrestler.first_name, wrestler.last_name, wrestler.suffix]
    .filter(Boolean).join(' ')

  const totalTournaments = groups.size

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <BackLink gender={wrestler.gender} />

      {/* Wrestler header */}
      <div className="flex items-baseline gap-4 mb-1">
        <h2 className="text-2xl font-bold text-slate-900">{displayName}</h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          wrestler.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {wrestler.gender === 'F' ? 'Girls' : 'Boys'}
        </span>
      </div>
      <p className="text-slate-500 mb-8">
        {displaySchool && (
          <>
            {primarySchool ? (
              <Link
                href={`/${wrestler.gender === 'M' ? 'boys' : 'girls'}/schools/${encodeURIComponent(primarySchool)}`}
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors"
              >
                {displaySchool}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{displaySchool}</span>
            )}
            {' · '}
          </>
        )}
        {primaryWeight && <>{primaryWeight} lb · </>}
        {districtNames.map(d => (
          <span key={d}>
            <Link
              href={`/${wrestler.gender === 'M' ? 'boys' : 'girls'}/districts/${d.slice(1)}`}
              className="hover:text-slate-800 transition-colors"
            >
              {d}
            </Link>
            {' · '}
          </span>
        ))}
        {regionNames.map(r => (
          <span key={r}>
            {wrestler.gender === 'M' ? (
              <Link
                href={`/boys/regions/${r.slice(1)}`}
                className="hover:text-slate-800 transition-colors"
              >
                {r}
              </Link>
            ) : (
              <Link
                href={`/girls/regions/${r.toLowerCase().replace(/ /g, '-')}`}
                className="hover:text-slate-800 transition-colors"
              >
                {r}
              </Link>
            )}
            {' · '}
          </span>
        ))}
        {primaryGrade && <>{primaryGrade} · </>}
        <span className="font-semibold text-slate-700">{wins}-{losses}</span>
        {' '}this season · {totalTournaments} tournament{totalTournaments !== 1 ? 's' : ''}
      </p>

      {/* Match history grouped by season, then by tournament + weight */}
      <div className="space-y-10">
        {seasonIds.map(seasonId => {
          const seasonGroups = bySeason.get(seasonId) ?? []
          const label = SEASON_LABELS[seasonId] ?? `Season ${seasonId}`
          return (
            <div key={seasonId}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 pb-1 border-b border-slate-100">
                {label}
              </h3>
              <div className="space-y-8">
                {seasonGroups.map(g => (
                  <section key={`${g.season_id}||${g.tournament_name}||${g.weight}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tournamentTypeColor(g.tournament_type)}`}>
                        {TOURNAMENT_TYPE_LABEL[g.tournament_type] ?? g.tournament_type}
                      </span>
                      <h4 className="font-semibold text-slate-800">
                        {g.tournament_name.replace('Boy_s ', '').replace('Girl_s ', '')}
                      </h4>
                      <span className="text-slate-400 text-sm">&middot; {g.weight} lb</span>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-slate-500 w-28">Round</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-500 w-10">Result</th>
                            <th className="text-left px-4 py-2 font-medium text-slate-500">Opponent</th>
                            <th className="text-right px-4 py-2 font-medium text-slate-500 w-32">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {g.matches.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5 text-slate-500">
                                {ROUND_LABEL[m.round ?? ''] ?? m.round ?? '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`font-bold text-sm ${
                                  m.result === 'W' ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                  {m.result}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-800 font-medium">
                                {m.opponentId ? (
                                  <Link
                                    href={`/wrestler/${m.opponentId}`}
                                    className="hover:text-blue-600 transition-colors"
                                  >
                                    {m.opponent}
                                  </Link>
                                ) : (
                                  m.opponent
                                )}
                                {m.opponentSchool && (
                                  <span className="ml-1.5 text-slate-400 font-normal text-xs">
                                    {m.opponentSchool}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-500 font-mono text-xs">
                                {m.win_type ? formatScore(m, m.result === 'W') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BackLink({ gender }: { gender: string }) {
  const href = gender === 'F' ? '/girls' : '/boys'
  return (
    <Link href={href} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
      ← Back to search
    </Link>
  )
}
