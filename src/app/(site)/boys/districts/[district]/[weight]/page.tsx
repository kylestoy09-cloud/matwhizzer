import { WeightHistoryView } from '@/components/site/TournamentHistory'
import { supabase } from '@/lib/supabase/public-cached'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { SchoolTag } from '@/components/SchoolTag'

type LogoMap = Awaited<ReturnType<typeof getSchoolLogos>>
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostseasonSeason } from '@/lib/get-season'
import { seasonWeights } from '@/lib/postseasonSeason'
import { getSeasonLabel } from '@/lib/seasons-server'
import { StdHeader } from '@/components/site/StdPage'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PostseasonBracket } from '@/components/bracket/PostseasonBracket'
import { getSiteLook } from '@/lib/siteLookServer'

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchRow = {
  match_id: string
  round: string
  bracket_side: string
  win_type: string | null
  winner_score: number | null
  loser_score: number | null
  fall_time_seconds: number | null
  winner_entry_id: string | null
  winner_wrestler_id: string | null
  winner_name: string | null
  winner_school: string | null
  winner_school_name: string | null
  winner_school_id?: number | null
  winner_seed: number | null
  winner_grade: string | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school: string | null
  loser_school_name: string | null
  loser_school_id?: number | null
  loser_seed: number | null
  loser_grade: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Fixed card height in pixels — used to compute slot heights for alignment
const CARD_H = 88

const PREV_ROUND: Record<string, string> = { SF: 'QF', F: 'SF', QF: 'R2' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatResult(m: MatchRow): string {
  if (!m.win_type) return ''
  if (m.win_type === 'BYE') return 'Adv.'
  if (m.win_type === 'FALL') {
    if (m.fall_time_seconds) {
      const mn = Math.floor(m.fall_time_seconds / 60)
      const sc = String(m.fall_time_seconds % 60).padStart(2, '0')
      return `Fall ${mn}:${sc}`
    }
    return 'Fall'
  }
  if (m.win_type === 'TF' || m.win_type === 'TF-1.5') {
    const score = (m.winner_score != null && m.loser_score != null)
      ? ` ${m.winner_score}-${m.loser_score}` : ''
    const time = m.fall_time_seconds
      ? ` ${Math.floor(m.fall_time_seconds / 60)}:${String(m.fall_time_seconds % 60).padStart(2, '0')}`
      : ''
    return `${m.win_type}${score}${time}`
  }
  if (m.win_type === 'MD' || m.win_type === 'DEC') {
    const label = m.win_type === 'MD' ? 'MD' : 'Dec'
    return (m.winner_score != null && m.loser_score != null)
      ? `${label} ${m.winner_score}-${m.loser_score}`
      : label
  }
  return m.win_type
}

// ── Bracket tree builder ───────────────────────────────────────────────────────

/**
 * Given championship matches, builds an ordered Map<round, MatchRow[]> where
 * the order within each round reflects the top-to-bottom visual bracket order.
 * Uses DFS from the Final match through the winner-entry linkage.
 */
function orderChampMatches(allChamp: MatchRow[]): Map<string, MatchRow[]> {
  // Group by round
  const byRound = new Map<string, MatchRow[]>()
  for (const m of allChamp) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  // Build lookup: winner_entry_id + ":" + round → match
  const byWinnerRound = new Map<string, MatchRow>()
  for (const [, ms] of byRound) {
    for (const m of ms) {
      if (m.winner_entry_id) {
        byWinnerRound.set(`${m.winner_entry_id}:${m.round}`, m)
      }
    }
  }

  const fMatches = byRound.get('F') ?? []
  if (fMatches.length !== 1) {
    // No final found — return rounds sorted by depth (fallback)
    return byRound
  }

  const ordered = new Map<string, MatchRow[]>()

  function collect(m: MatchRow) {
    const prev = PREV_ROUND[m.round]
    if (prev) {
      if (m.winner_entry_id) {
        const top = byWinnerRound.get(`${m.winner_entry_id}:${prev}`)
        if (top) collect(top)
      }
      if (m.loser_entry_id) {
        const bot = byWinnerRound.get(`${m.loser_entry_id}:${prev}`)
        if (bot) collect(bot)
      }
    }
    const list = ordered.get(m.round) ?? []
    if (!list.some(x => x.match_id === m.match_id)) {
      list.push(m)
      ordered.set(m.round, list)
    }
  }

  collect(fMatches[0])

  // Append any rounds missed by the tree traversal
  for (const [round, ms] of byRound) {
    if (!ordered.has(round)) ordered.set(round, ms)
  }

  return ordered
}

// ── Bye synthesis from match data ──────────────────────────────────────────────

// ── Match Card ─────────────────────────────────────────────────────────────────

function WrestlerRow({
  wrestlerId,
  name,
  school,
  schoolId,
  seed,
  grade,
  isWinner,
  isBye,
}: {
  wrestlerId: string | null
  name: string | null
  school: string | null
  schoolId?: number | null
  seed: number | null
  grade: string | null
  isWinner: boolean
  isBye: boolean
}) {
  const inner = isBye ? (
    <span className="text-xs text-slate-400 italic">Bye</span>
  ) : wrestlerId ? (
    <Link
      href={`/boys/wrestler/${wrestlerId}`}
      className={`text-sm truncate hover:underline ${
        isWinner ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
      }`}
    >
      {name}
    </Link>
  ) : (
    <span className="text-xs text-slate-400">—</span>
  )

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 ${isWinner ? 'bg-emerald-50' : ''}`}
      style={{ height: 36 }}
    >
      {seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate">{inner}</span>
      {!isBye && (
        <span className="text-[10px] text-slate-400 shrink-0 flex items-center">
          {wrestlerId && <SchoolTag id={schoolId} name={school} maxWidth={52} className="text-[10px] text-slate-400" />}
          {grade ? <span className="ml-1 text-slate-300">{grade}</span> : null}
        </span>
      )}
    </div>
  )
}

function MatchCard({ m, entrySlot }: { m: MatchRow; entrySlot?: Map<string, number> }) {
  const isBye = !m.loser_wrestler_id
  const result = formatResult(m)

  let topIsWinner = true
  if (entrySlot && m.winner_entry_id && m.loser_entry_id) {
    const wSlot = entrySlot.get(m.winner_entry_id) ?? 999
    const lSlot = entrySlot.get(m.loser_entry_id) ?? 999
    topIsWinner = wSlot <= lSlot
  }

  const top = topIsWinner
    ? { id: m.winner_wrestler_id, name: m.winner_name, school: m.winner_school_name, schoolId: m.winner_school_id, seed: m.winner_seed, grade: m.winner_grade, won: true, isBye: false }
    : { id: m.loser_wrestler_id, name: m.loser_name, school: m.loser_school_name, schoolId: m.loser_school_id, seed: m.loser_seed, grade: m.loser_grade, won: false, isBye: isBye }
  const bot = topIsWinner
    ? { id: m.loser_wrestler_id, name: m.loser_name, school: m.loser_school_name, schoolId: m.loser_school_id, seed: m.loser_seed, grade: m.loser_grade, won: false, isBye: isBye }
    : { id: m.winner_wrestler_id, name: m.winner_name, school: m.winner_school_name, schoolId: m.winner_school_id, seed: m.winner_seed, grade: m.winner_grade, won: true, isBye: false }

  return (
    <div
      className="bg-white border border-black rounded-none overflow-hidden shadow-none w-64 shrink-0"
      style={{ height: CARD_H }}
    >
      <WrestlerRow
        wrestlerId={top.id}
        name={top.name}
        school={top.school}
        schoolId={top.schoolId}
        seed={top.seed}
        grade={top.grade}
        isWinner={top.won}
        isBye={top.isBye}
      />
      <div className="border-t border-slate-100" />
      <WrestlerRow
        wrestlerId={bot.id}
        name={bot.name}
        school={bot.school}
        schoolId={bot.schoolId}
        seed={bot.seed}
        grade={bot.grade}
        isWinner={bot.won}
        isBye={bot.isBye}
      />
      {/* Result strip */}
      <div
        className="flex items-center justify-end px-2.5 border-t border-slate-100"
        style={{ height: CARD_H - 36 - 36 - 1 - 1 }} // card - 2 rows - 2 borders
      >
        <span className="text-[10px] text-slate-400 tabular-nums">{result}</span>
      </div>
    </div>
  )
}

// ── Mobile round list ──────────────────────────────────────────────────────────

function MobileRound({ label, matches, entrySlot }: { label: string; matches: MatchRow[]; entrySlot?: Map<string, number> }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h3>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.match_id} m={m} entrySlot={entrySlot} />
        ))}
      </div>
    </section>
  )
}

// ── Roster builder ───────────────────────────────────────────────────────────

type RosterEntry = {
  wrestler_id: string
  name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  seed: number | null
  grade: string | null
}

function buildRoster(matches: MatchRow[]): RosterEntry[] {
  const seen = new Set<string>()
  const roster: RosterEntry[] = []
  for (const m of matches) {
    if (m.winner_wrestler_id && !seen.has(m.winner_wrestler_id)) {
      seen.add(m.winner_wrestler_id)
      roster.push({
        wrestler_id: m.winner_wrestler_id, name: m.winner_name ?? '—',
        school: m.winner_school, school_name: m.winner_school_name, school_id: m.winner_school_id,
        seed: m.winner_seed, grade: m.winner_grade,
      })
    }
    if (m.loser_wrestler_id && !seen.has(m.loser_wrestler_id)) {
      seen.add(m.loser_wrestler_id)
      roster.push({
        wrestler_id: m.loser_wrestler_id, name: m.loser_name ?? '—',
        school: m.loser_school, school_name: m.loser_school_name, school_id: m.loser_school_id,
        seed: m.loser_seed, grade: m.loser_grade,
      })
    }
  }
  roster.sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    return a.name.localeCompare(b.name)
  })
  return roster
}

function EntryRoster({ roster, logos }: { roster: RosterEntry[]; logos: LogoMap }) {
  if (roster.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Entries ({roster.length})
      </h2>
      <div className="overflow-x-auto rounded-none border border-black shadow-none">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-10">Seed</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">School</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-12">Gr</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r, i) => (
              <tr key={r.wrestler_id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                <td className="px-3 py-1.5 text-slate-400 text-xs tabular-nums">{r.seed ?? ''}</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <SchoolLogoBadge {...logos.badgeById(r.school_id)} />
                    <Link href={`/boys/wrestler/${r.wrestler_id}`} className="font-medium text-slate-700 hover:underline">
                      {r.name}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{r.school_id != null ? r.school_name : 'TBD'}</td>
                <td className="px-3 py-1.5 text-slate-400 text-xs">{r.grade ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285] as const

function WeightNav({ weights, current, base }: {
  weights: readonly number[]
  current: number
  base: string
}) {
  return (
    <div className="mt-10 pt-6 border-t border-slate-100">
      <div className="flex flex-wrap gap-1.5">
        {weights.map(w => (
          <Link
            key={w}
            href={`${base}/${w}`}
            className={`px-3 py-1.5 rounded-none text-sm font-semibold transition-colors ${
              w === current
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-black text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-none'
            }`}
          >
            {w}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DistrictBracketPage({
  params,
}: {
  params: Promise<{ district: string; weight: string }>
}) {
  const { district: rawD, weight: rawW } = await params
  const district = Number(rawD)
  const weight   = Number(rawW)

  if (!district || district < 1 || district > 32 || !weight) notFound()

  const { season, options: seasonOptions } = await getPostseasonSeason('M')

  const weights = await seasonWeights('M', season, WEIGHTS)   // the season's own classes (Playoff History)
  const seasonLbl = await getSeasonLabel(season)

  const [{ data }, logos] = await Promise.all([
    supabase.rpc('district_bracket', {
      p_district: district,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    getSchoolLogos(),
  ])
  const look = (await getSiteLook()).bracket

  const matches = (data ?? []) as MatchRow[]
  if (matches.length === 0) {
    // no bracket on file, but a podium (history_podiums, e.g. 2012-13 District 24 — Kyle 2026-11-14)
    const { data: pod } = await supabase.from('history_podiums')
      .select('place, source, wrestler_id, school_id, wrestler:wrestlers(first_name, last_name), school:schools(display_name), tournament:tournaments!inner(name, season_id)')
      .eq('tournament.name', `Boy_s Districts District ${district}`).eq('tournament.season_id', season).eq('weight', weight).order('place')
    const rows = (pod ?? []) as unknown as { place: number; source: string; wrestler_id: string | null; school_id: number | null; wrestler: { first_name: string; last_name: string } | null; school: { display_name: string } | null }[]
    if (!rows.length) notFound()
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href={`/boys/districts/${district}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
          ← District {district}
        </Link>
        <StdHeader title={`Boys District ${district} · ${weight} lb`} summaryKey="district" hideSummary noLogo
          picker={<><InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} /></>} />
        <WeightNav weights={weights} current={weight} base={`/boys/districts/${district}`} />
        <p className="mb-4 text-sm text-slate-600 border border-slate-300 bg-slate-50 px-3 py-2">
          Bracket not available for this year — placers from the {rows[0].source}.
        </p>
        <table className="w-full text-sm border border-black">
          <tbody>
            {rows.map(r => (
              <tr key={r.place} className="border-b border-slate-200">
                <td className="px-3 py-1 w-16 font-semibold text-slate-500">{['', '1st', '2nd', '3rd', '4th'][r.place] ?? r.place}</td>
                <td className="px-3 py-1 font-medium">{r.wrestler_id && r.wrestler ? <Link href={`/boys/wrestler/${r.wrestler_id}`} className="hover:underline">{r.wrestler.first_name} {r.wrestler.last_name}</Link> : 'TBD'}</td>
                <td className="px-3 py-1 text-slate-600">{r.school_id != null ? <Link href={`/boys/schools/${r.school_id}`} className="hover:underline">{r.school?.display_name ?? 'TBD'}</Link> : 'TBD'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href={`/boys/districts/${district}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← District {district}
      </Link>

      <StdHeader title={`Boys District ${district} · ${weight} lb`} summaryKey="district" hideSummary noLogo
        picker={<><InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} /></>} />

      <WeightNav weights={weights} current={weight} base={`/boys/districts/${district}`} />

      <PostseasonBracket matches={matches} size={16} look={look} />
      <EntryRoster roster={buildRoster(matches)} logos={logos} />
      <WeightNav weights={weights} current={weight} base={`/boys/districts/${district}`} />

      <WeightHistoryView gender="M" level="district" num={district} seasons={seasonOptions.map(o => o.id)} weight={weight} />
    </div>
  )
}
