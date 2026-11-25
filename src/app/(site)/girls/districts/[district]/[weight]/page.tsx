import { WeightHistoryView } from '@/components/site/TournamentHistory'
import { supabase } from '@/lib/supabase/public-cached'
import { getSeasonIdsWithTournamentType } from '@/lib/seasons-server'
import { getPostseasonSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'
import { StdHeader } from '@/components/site/StdPage'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PostseasonBracket } from '@/components/bracket/PostseasonBracket'
import { getSiteLook } from '@/lib/siteLookServer'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

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

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── Bracket tree builder ───────────────────────────────────────────────────────

// ── Bye synthesis from match data ──────────────────────────────────────────────

// ── Match Card ─────────────────────────────────────────────────────────────────

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
                    <Link href={`/girls/wrestler/${r.wrestler_id}`} className="font-medium text-slate-700 hover:underline">
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

const WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] as const

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

export default async function GirlsDistrictBracketPage({
  params,
}: {
  params: Promise<{ district: string; weight: string }>
}) {
  const { district: rawD, weight: rawW } = await params
  const district = Number(rawD)
  const weight   = Number(rawW)

  if (!district || district < 1 || district > 12 || !weight) notFound()

  // Girls districts only exist from season 2 onward
  const districtSeasons = await getSeasonIdsWithTournamentType('districts', 'F')
  const { season: picked, options } = await getPostseasonSeason('F')
  const season = districtSeasons.includes(picked) ? picked : (districtSeasons[0] ?? picked)
  const seasonOptions = options.filter(o => districtSeasons.includes(o.id))
  const seasonLbl = await getSeasonLabel(season)

  const [{ data }, logos] = await Promise.all([
    supabase.rpc('district_bracket', {
      p_district: district,
      p_weight: weight,
      p_gender: 'F',
      p_season: season,
    }),
    getSchoolLogos(),
  ])
  const look = (await getSiteLook()).bracket

  const matches = (data ?? []) as MatchRow[]
  if (matches.length === 0) notFound()

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href={`/girls/districts/${district}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← District {district}
      </Link>

      <StdHeader title={`Girls District ${district} · ${weight} lb`} summaryKey="district" hideSummary noLogo
        picker={<><InlineSeasonPicker arrows gender="F" activeSeason={season} options={seasonOptions} /></>} />

      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/districts/${district}`} />

      <PostseasonBracket matches={matches} size={16} look={look} gender="F" prelims />
      <EntryRoster roster={buildRoster(matches)} logos={logos} />
      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/districts/${district}`} />

      <WeightHistoryView gender="F" level="district" num={district} seasons={seasonOptions.map(o => o.id)} weight={weight} />
    </div>
  )
}
