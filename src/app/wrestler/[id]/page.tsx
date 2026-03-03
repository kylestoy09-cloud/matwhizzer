import { supabase, ROUND_ORDER, ROUND_LABEL, TOURNAMENT_TYPE_LABEL } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type TournamentInfo  = { name: string; tournament_type: string }
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

type GroupKey = string  // "{tournament_name}||{weight}"

type MatchGroup = {
  tournament_name: string
  tournament_type: string
  weight: number
  matches: (Match & { result: 'W' | 'L'; opponent: string })[]
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

  // 2. All entries for this wrestler (include school + grade)
  const { data: entries } = await supabase
    .from('tournament_entries')
    .select('id, school_context_raw, grade_label')
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

  // Primary school and grade from district entries (most complete data source)
  type EntryRow = { id: string; school_context_raw: string | null; grade_label: string | null }
  const typedEntries = (entries ?? []) as unknown as EntryRow[]
  const primarySchool = typedEntries.find(e => e.school_context_raw)?.school_context_raw ?? null
  const primaryGrade  = typedEntries.find(e => e.grade_label)?.grade_label ?? null

  // 3. Matches as winner + matches as loser (parallel), plus school name lookup
  const selectFields = `
    id, round, bracket_side, win_type,
    winner_score, loser_score, fall_time_seconds,
    winner_entry_id, loser_entry_id, winner_context_raw,
    tournament:tournaments(name, tournament_type),
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

  const opponentMap: Record<string, string> = {}
  if (opponentEntryIds.length > 0) {
    const { data: oppEntries } = await supabase
      .from('tournament_entries')
      .select('id, wrestler:wrestlers(first_name, last_name)')
      .in('id', opponentEntryIds)

    type OppEntry = { id: string; wrestler: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }
    for (const e of (oppEntries ?? []) as unknown as OppEntry[]) {
      const w = unwrap(e.wrestler)
      opponentMap[e.id] = w ? `${w.first_name} ${w.last_name}`.trim() : '—'
    }
  }

  // 5. Annotate each match with result + opponent name
  const entrySet = new Set(entryIds)
  const annotated = allMatches.map(m => {
    const isWinner = m.winner_entry_id != null && entrySet.has(m.winner_entry_id)
    const opponentEntryId = isWinner ? m.loser_entry_id : m.winner_entry_id
    // A bye is win_type=null with no resolved loser entry.
    // A regions match with win_type=null but a real opponent has loser_entry_id set.
    const isBye = m.win_type == null && m.loser_entry_id == null
    const opponent = isBye
      ? 'Bye'
      : (opponentEntryId
          ? (opponentMap[opponentEntryId] ?? m.winner_context_raw ?? '—')
          : '—')
    return { ...m, result: (isWinner ? 'W' : 'L') as 'W' | 'L', opponent }
  })

  // 6. Group by tournament + weight, sort rounds within each group
  const groups = new Map<GroupKey, MatchGroup>()
  for (const m of annotated) {
    const t      = unwrap(m.tournament)
    const wc     = unwrap(m.weight_class)
    const tname  = t?.name ?? 'Unknown'
    const ttype  = t?.tournament_type ?? ''
    const weight = wc?.weight ?? 0
    const key: GroupKey = `${tname}||${weight}`
    if (!groups.has(key)) {
      groups.set(key, { tournament_name: tname, tournament_type: ttype, weight, matches: [] })
    }
    groups.get(key)!.matches.push(m)
  }

  // Sort matches within each group by round order
  for (const g of groups.values()) {
    g.matches.sort((a, b) =>
      (ROUND_ORDER[a.round ?? ''] ?? 99) - (ROUND_ORDER[b.round ?? ''] ?? 99)
    )
  }

  // Sort groups: tournaments alphabetically, then by weight
  const sortedGroups = [...groups.values()].sort((a, b) =>
    a.tournament_name.localeCompare(b.tournament_name) || a.weight - b.weight
  )

  const wins   = annotated.filter(m => m.result === 'W').length
  const losses = annotated.filter(m => m.result === 'L').length

  const displayName = [wrestler.first_name, wrestler.last_name, wrestler.suffix]
    .filter(Boolean).join(' ')

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
            {wrestler.gender === 'M' && primarySchool ? (
              <Link
                href={`/boys/schools/${encodeURIComponent(primarySchool)}`}
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors"
              >
                {displaySchool}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{displaySchool}</span>
            )}
            {primaryGrade && <span className="text-slate-400"> · {primaryGrade}</span>}
            {' · '}
          </>
        )}
        <span className="font-semibold text-slate-700">{wins}-{losses}</span>
        {' '}record · {sortedGroups.length} tournament{sortedGroups.length !== 1 ? 's' : ''}
      </p>

      {/* Match history grouped by tournament + weight */}
      <div className="space-y-8">
        {sortedGroups.map(g => (
          <section key={`${g.tournament_name}||${g.weight}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tournamentTypeColor(g.tournament_type)}`}>
                {TOURNAMENT_TYPE_LABEL[g.tournament_type] ?? g.tournament_type}
              </span>
              <h3 className="font-semibold text-slate-800">
                {g.tournament_name.replace('Boy_s ', '').replace('Girl_s ', '')}
              </h3>
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
                        {m.opponent}
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
}

function BackLink({ gender }: { gender: string }) {
  const href = gender === 'F' ? '/girls' : '/boys'
  return (
    <Link href={href} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
      ← Back to search
    </Link>
  )
}
