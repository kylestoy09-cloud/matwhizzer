import { WeightHistoryView } from '@/components/site/TournamentHistory'
import { supabase } from '@/lib/supabase/public-cached'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPostseasonSeason } from '@/lib/get-season'
import { seasonWeights, regionLabels } from '@/lib/postseasonSeason'
import { getSeasonLabel } from '@/lib/seasons-server'
import { BracketPoll, type BracketEntry, type DistrictChamp } from '@/components/BracketPoll'
import { StdHeader } from '@/components/site/StdPage'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PostseasonBracket } from '@/components/bracket/PostseasonBracket'
import { getSiteLook } from '@/lib/siteLookServer'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { SchoolTag } from '@/components/SchoolTag'

type LogoMap = Awaited<ReturnType<typeof getSchoolLogos>>

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

// For orderChampMatches DFS
const PREV_ROUND: Record<string, string> = { QF: 'R2', SF: 'QF', F: 'SF' }

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Bracket ordering (DFS from Final) ────────────────────────────────────────

function orderChampMatches(allChamp: MatchRow[]): Map<string, MatchRow[]> {
  const byRound = new Map<string, MatchRow[]>()
  for (const m of allChamp) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }

  const byWinnerRound = new Map<string, MatchRow>()
  for (const [, ms] of byRound) {
    for (const m of ms) {
      if (m.winner_entry_id) {
        byWinnerRound.set(`${m.winner_entry_id}:${m.round}`, m)
      }
    }
  }

  const fMatches = byRound.get('F') ?? []
  if (fMatches.length !== 1) return byRound

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

  for (const [round, ms] of byRound) {
    if (!ordered.has(round)) ordered.set(round, ms)
  }

  return ordered
}

// ── Bye synthesis ─────────────────────────────────────────────────────────

// ── Combined first round (byes + prelims in bracket order) ───────────────────

// ── Match Card ────────────────────────────────────────────────────────────────

// ── Entry Card (pre-tournament) ──────────────────────────────────────────────

type EntryRow = {
  entry_id: string
  wrestler_id: string
  wrestler_name: string
  school: string
  school_name: string
  school_id?: number | null
  seed: number | null
  grade: string | null
  wins: number | null
  losses: number | null
}

function EntryWrestlerRow({ entry }: { entry: EntryRow }) {
  const record = (entry.wins != null && entry.losses != null)
    ? `${entry.wins}-${entry.losses}` : null

  return (
    <div className="flex items-center gap-1 px-2" style={{ height: 36 }}>
      {entry.seed != null ? (
        <span className="text-[10px] text-slate-400 w-3.5 shrink-0 text-right">{entry.seed}</span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <Link
          href={`/boys/wrestler/${entry.wrestler_id}`}
          className="text-[13px] font-medium text-slate-700 hover:underline block truncate"
        >
          {entry.wrestler_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.grade && <span className="text-[10px] text-slate-400">{entry.grade}</span>}
          {record && <span className="text-[10px] text-slate-400 tabular-nums">{record}</span>}
        </div>
      </div>
      <span className="text-[10px] text-slate-400 shrink-0 flex items-center">
        <SchoolTag id={entry.school_id} name={entry.school_name} maxWidth={100} />
      </span>
    </div>
  )
}

function EntryCard({ top, bot }: { top: EntryRow; bot: EntryRow | null }) {
  return (
    <div className="bg-white border border-black rounded-none overflow-hidden shadow-none w-[216px] shrink-0">
      <EntryWrestlerRow entry={top} />
      <div className="border-t border-slate-100" />
      {bot ? (
        <EntryWrestlerRow entry={bot} />
      ) : (
        <div className="flex items-center px-2 text-[11px] text-slate-400 italic" style={{ height: 36 }}>
          Bye
        </div>
      )}
    </div>
  )
}

function EntriesView({ entries }: { entries: EntryRow[] }) {
  const n = entries.length
  const pairs: [EntryRow, EntryRow | null][] = []
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    pairs.push([entries[i], n - 1 - i > i ? entries[n - 1 - i] : null])
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">Entries · Results not yet available</p>
      <div className="flex flex-col gap-3">
        {pairs.map(([top, bot]) => (
          <EntryCard key={top.entry_id} top={top} bot={bot} />
        ))}
      </div>
    </div>
  )
}

// ── Roster builder ───────────────────────────────────────────────────────────

type RosterItem = {
  wrestler_id: string
  name: string
  school: string | null
  school_name: string | null
  school_id?: number | null
  seed: number | null
  grade: string | null
}

function buildRosterFromMatches(matches: MatchRow[]): RosterItem[] {
  const seen = new Set<string>()
  const roster: RosterItem[] = []
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

function buildRosterFromEntries(entries: EntryRow[]): RosterItem[] {
  return entries.map(e => ({
    wrestler_id: e.wrestler_id, name: e.wrestler_name,
    school: e.school, school_name: e.school_name, school_id: e.school_id,
    seed: e.seed, grade: e.grade,
  })).sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed
    if (a.seed != null) return -1
    if (b.seed != null) return 1
    return a.name.localeCompare(b.name)
  })
}

function RosterTable({ roster, logos }: { roster: RosterItem[]; logos: LogoMap }) {
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

// ── Bracket column renderer ──────────────────────────────────────────────────

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RegionBracketPage({
  params,
}: {
  params: Promise<{ region: string; weight: string }>
}) {
  const { region: rawR, weight: rawW } = await params
  const region = Number(rawR)
  const weight = Number(rawW)

  if (!region || region < 1 || region > 8 || !weight) notFound()

  const { season, options: seasonOptions } = await getPostseasonSeason('M')
  const rl = await regionLabels('M', season)   // the region's own name, else "Region N"

  const weights = await seasonWeights('M', season, WEIGHTS)   // the season's own classes (Playoff History)
  const seasonLbl = await getSeasonLabel(season)

  const [{ data: matchData }, { data: entryData }, { data: champData }, logos] = await Promise.all([
    supabase.rpc('region_bracket', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('region_bracket_entries_v2', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    supabase.rpc('region_district_champs', {
      p_region: region,
      p_weight: weight,
      p_gender: 'M',
      p_season: season,
    }),
    getSchoolLogos(),
  ])
  const look = (await getSiteLook()).bracket

  const matches = (matchData ?? []) as MatchRow[]
  const entries = ((entryData ?? []) as (BracketEntry & { tournament_id: number; weight_class_id: number })[])
    .map(e => ({ ...e, badge: logos.badgeById(e.school_id) }))
  const rawChamps = ((champData ?? []) as DistrictChamp[]).map(dc => ({ ...dc, badge: logos.badgeById(dc.school_id) }))

  // Annotate district placers who withdrew (not in region entries) and their replacements
  const entryWrestlerIds = new Set(entries.map(e => e.wrestler_id))
  const districtChamps = rawChamps.map(dc => {
    if (dc.place >= 1 && dc.place <= 3 && !entryWrestlerIds.has(dc.wrestler_id)) {
      return { ...dc, annotation: 'Withdrawn' }
    }
    if (dc.place === 4) {
      if (entryWrestlerIds.has(dc.wrestler_id)) {
        const withdrawn = rawChamps.find(c =>
          c.district_num === dc.district_num && c.place >= 1 && c.place <= 3
          && !entryWrestlerIds.has(c.wrestler_id)
        )
        if (withdrawn) {
          return { ...dc, annotation: 'ActiveAlternate' }
        }
      }
      return { ...dc, annotation: 'Alternate' }
    }
    return dc
  })

  if (matches.length === 0 && entries.length === 0) notFound()

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <style>{`@keyframes bracketFade{from{opacity:1}to{opacity:0}}`}</style>

      <Link
        href={`/boys/regions/${region}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Region {region}
      </Link>

      <StdHeader title={`Boys ${rl.label(region)} · ${weight} lb`} summaryKey="region" hideSummary noLogo
        picker={<><InlineSeasonPicker arrows gender="M" activeSeason={season} options={seasonOptions} /></>} />

      <WeightNav weights={weights} current={weight} base={`/boys/regions/${region}`} />

      {matches.length === 0 ? (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={false}
          bracketSize={16}
          provenancePrefix="D"
          districtChamps={districtChamps}
        />
      ) : (<>

      <PostseasonBracket matches={matches} size={16} look={look} />
      </>)}
      <RosterTable roster={matches.length > 0 ? buildRosterFromMatches(matches) : buildRosterFromEntries(entries as EntryRow[])} logos={logos} />
      {/* Poll results below entries */}
      {matches.length > 0 && entries.length > 0 && (
        <BracketPoll
          entries={entries}
          tournamentId={entries[0]?.tournament_id ?? 0}
          weightClassId={entries[0]?.weight_class_id ?? 0}
          hasMatches={true}
          bracketSize={16}
          provenancePrefix="D"
          districtChamps={districtChamps}
        />
      )}
      <WeightNav weights={weights} current={weight} base={`/boys/regions/${region}`} />

      <WeightHistoryView gender="M" level="region" num={region} seasons={seasonOptions.map(o => o.id)} weight={weight} />
    </div>
  )
}
