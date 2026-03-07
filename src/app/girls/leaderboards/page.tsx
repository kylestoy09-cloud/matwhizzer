import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import {
  LeaderTable, WrestlerCell, TabNav, SectionHeader,
  fmtTime, fmtSchool, cleanTournament,
  type DomRow, type DistrictRow, type SchoolRow,
  type WeightRow, type ComebackRow,
} from '@/components/leaderboard-ui'

// ── Pool-specific types ───────────────────────────────────────────────────────

type PoolFastRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  fall_time_seconds: number
  weight: number
}

type PoolPinRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  pin_count: number
}

type PoolTfRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  tf_count: number
}

type PoolBonusRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  bonus_wins: number
  total_wins: number
}

type PoolDomRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  dominance_score: number
  win_count: number
}

type PoolMatTimeRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  total_seconds: number
  match_count: number
}

type PoolTeamRow = {
  school: string | null
  school_name: string | null
  total_points: number
  match_count: number
}

type PoolWrestlerPtsRow = {
  wrestler_id: string
  wrestler_name: string
  school: string | null
  school_name: string | null
  total_points: number
  win_count: number
}

type PoolData = {
  fastestPin:   PoolFastRow[]
  fastestTf:    PoolFastRow[]
  mostPins:     PoolPinRow[]
  mostTf:       PoolTfRow[]
  mostBonus:    PoolBonusRow[]
  poolDom:      PoolDomRow[]
  matTime:      PoolMatTimeRow[]
  teamPoints:   PoolTeamRow[]
  wrestlerPts:  PoolWrestlerPtsRow[]
}

type UpsetRow = {
  winner_id: string; winner_name: string; winner_school: string | null
  loser_id: string; loser_name: string; loser_school: string | null
  winner_seed: number; loser_seed: number; seed_gap: number
  round: string; tournament_name: string; weight: number
}

type AnalyticsData = {
  dominance:  DomRow[]
  districts:  DistrictRow[]
  schools:    SchoolRow[]
  weights:    WeightRow[]
  comebacks:  ComebackRow[]
  upsets:     UpsetRow[]
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchPoolStats(pool: string, season: number): Promise<PoolData> {
  const p = { p_pool: pool, p_season: season }
  const [
    { data: fastestPin },
    { data: fastestTf },
    { data: mostPins },
    { data: mostTf },
    { data: mostBonus },
    { data: poolDom },
    { data: matTime },
    { data: teamPoints },
    { data: wrestlerPts },
  ] = await Promise.all([
    supabase.rpc('lb_gp_fastest_pin',        p),
    supabase.rpc('lb_gp_fastest_tf',         p),
    supabase.rpc('lb_gp_most_pins',          p),
    supabase.rpc('lb_gp_most_tf',            p),
    supabase.rpc('lb_gp_most_bonus',         p),
    supabase.rpc('lb_gp_dominance',          p),
    supabase.rpc('lb_gp_mat_time',           p),
    supabase.rpc('lb_gp_team_points',        p),
    supabase.rpc('lb_gp_wrestler_points',    p),
  ])
  return {
    fastestPin:  (fastestPin  ?? []) as PoolFastRow[],
    fastestTf:   (fastestTf   ?? []) as PoolFastRow[],
    mostPins:    (mostPins    ?? []) as PoolPinRow[],
    mostTf:      (mostTf      ?? []) as PoolTfRow[],
    mostBonus:   (mostBonus   ?? []) as PoolBonusRow[],
    poolDom:     (poolDom     ?? []) as PoolDomRow[],
    matTime:     (matTime     ?? []) as PoolMatTimeRow[],
    teamPoints:  (teamPoints  ?? []) as PoolTeamRow[],
    wrestlerPts: (wrestlerPts ?? []) as PoolWrestlerPtsRow[],
  }
}

async function fetchAnalytics(season: number): Promise<AnalyticsData> {
  const [
    { data: dominance },
    { data: districts },
    { data: schools },
    { data: weights },
    { data: comebacks },
    { data: upsets },
  ] = await Promise.all([
    supabase.rpc('lb_dominance',              { p_gender: 'F', p_season: season }),
    supabase.rpc('lb_district_strength',      { p_gender: 'F', p_season: season }),
    supabase.rpc('lb_school_depth',           { p_gender: 'F', p_season: season }),
    supabase.rpc('lb_weight_competitiveness', { p_gender: 'F', p_season: season }),
    supabase.rpc('lb_comebacks',              { p_gender: 'F', p_season: season }),
    supabase.rpc('lb_bracket_buster',         { p_gender: 'F', p_season: season }),
  ])
  return {
    dominance:  ((dominance  ?? []) as DomRow[]).slice(0, 25),
    districts:  (districts  ?? []) as DistrictRow[],
    schools:    (schools    ?? []) as SchoolRow[],
    weights:    (weights    ?? []) as WeightRow[],
    comebacks:  (comebacks  ?? []) as ComebackRow[],
    upsets:     (upsets      ?? []) as UpsetRow[],
  }
}

// ── Pool selector ─────────────────────────────────────────────────────────────

const POOL_OPTIONS = [
  { key: 'districts', label: 'Districts', desc: 'District matches only' },
  { key: 'region',    label: 'Regions',   desc: 'Districts + Regions' },
  { key: 'state',     label: 'State',     desc: 'All tournaments' },
] as const

function PoolNav({ active, tab }: { active: string; tab: string }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide mr-1 hidden sm:inline">Pool:</span>
      {POOL_OPTIONS.map(p => (
        <Link
          key={p.key}
          href={`/girls/leaderboards?tab=${tab}&pool=${p.key}`}
          title={p.desc}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === p.key
              ? 'bg-rose-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  )
}

// ── Pool-aware wrestler cell ───────────────────────────────────────────────────

function PWCell({ id, name, school }: { id: string; name: string; school: string | null }) {
  return (
    <span className="flex items-baseline gap-2 min-w-0">
      <Link
        href={`/wrestler/${id}`}
        className="font-medium text-slate-800 hover:text-blue-600 transition-colors truncate"
      >
        {name}
      </Link>
      {school && (
        <span className="text-slate-400 text-xs shrink-0">{school}</span>
      )}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GirlsLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; pool?: string }>
}) {
  const { tab = 'wrestlers', pool = 'region' } = await searchParams
  const isAnalytics = tab === 'analytics'
  const activePool = (['districts', 'region', 'state'] as const).includes(pool as 'districts' | 'region' | 'state')
    ? pool
    : 'districts'

  const season = await getActiveSeason()

  const data = isAnalytics ? await fetchAnalytics(season) : await fetchPoolStats(activePool, season)

  const poolLabel = POOL_OPTIONS.find(p => p.key === activePool)?.desc ?? ''

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-rose-900">Girls Leaderboards</h1>
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>girls postseason — regions &amp; state</span>
        </div>
      </div>

      <TabNav active={tab} basePath="/girls/leaderboards" />

      {!isAnalytics ? (
        <>
          <PoolNav active={activePool} tab={tab} />
          <WrestlerTab d={data as PoolData} poolLabel={poolLabel} />
        </>
      ) : (
        <AnalyticsTab d={data as AnalyticsData} />
      )}
    </div>
  )
}

// ── Wrestler tab ──────────────────────────────────────────────────────────────

function WrestlerTab({ d, poolLabel }: { d: PoolData; poolLabel: string }) {
  return (
    <div className="space-y-12">

      {/* ── Single-Match Bests ── */}
      <section>
        <SectionHeader
          title="Single-Match Bests"
          description={`Fastest individual performances — ${poolLabel}`}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <LeaderTable<PoolFastRow>
            title="Quickest Deck"
            description="Single quickest fall in any match"
            rows={d.fastestPin}
            cols={[
              {
                label: 'Wrestler', align: 'left',
                render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
              },
              {
                label: 'Wt', align: 'right',
                render: r => <span className="text-slate-500 tabular-nums">{r.weight}</span>,
              },
              {
                label: 'Time', align: 'right',
                render: r => (
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {fmtTime(r.fall_time_seconds)}
                  </span>
                ),
              },
            ]}
          />

          <LeaderTable<PoolFastRow>
            title="Quickest Tech"
            description="Single quickest tech fall in any match"
            rows={d.fastestTf}
            cols={[
              {
                label: 'Wrestler', align: 'left',
                render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
              },
              {
                label: 'Wt', align: 'right',
                render: r => <span className="text-slate-500 tabular-nums">{r.weight}</span>,
              },
              {
                label: 'Time', align: 'right',
                render: r => (
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {fmtTime(r.fall_time_seconds)}
                  </span>
                ),
              },
            ]}
          />

        </div>
      </section>

      {/* ── Season Leaders ── */}
      <section>
        <SectionHeader
          title="Season Leaders"
          description={`Cumulative stats across all matches — ${poolLabel}`}
        />
        <div className="space-y-8">

          {/* Wrestler Points — full width */}
          <LeaderTable<PoolWrestlerPtsRow>
            title="Wrestler Points"
            description="TrackWrestling formula — round base + FALL+2, TF+1.5, MD+1"
            rows={d.wrestlerPts}
            cols={[
              {
                label: 'Wrestler', align: 'left',
                render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
              },
              {
                label: 'Wins', align: 'right',
                render: r => <span className="text-slate-500 tabular-nums">{r.win_count}</span>,
              },
              {
                label: 'Points', align: 'right',
                render: r => <span className="font-bold text-slate-800 tabular-nums">{r.total_points}</span>,
              },
            ]}
          />

          {/* Team Points — full width */}
          <LeaderTable<PoolTeamRow>
            title="Team Points"
            description="TrackWrestling formula — round base + win bonus (FALL+2, TF+1.5, MD+1)"
            rows={d.teamPoints.filter(r => r.school !== null)}
            cols={[
              {
                label: 'School', align: 'left',
                render: r => (
                  <span className="font-medium text-slate-800">
                    {r.school_name || r.school || '—'}
                  </span>
                ),
              },
              {
                label: 'Points', align: 'right',
                render: r => <span className="font-bold text-slate-800 tabular-nums">{r.total_points}</span>,
              },
              {
                label: 'Wins', align: 'right',
                render: r => <span className="text-slate-500 tabular-nums">{r.match_count}</span>,
              },
            ]}
          />

          {/* 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            <LeaderTable<PoolPinRow>
              title="Most Pins"
              description="Total fall wins"
              rows={d.mostPins}
              cols={[
                {
                  label: 'Wrestler', align: 'left',
                  render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
                },
                {
                  label: 'Pins', align: 'right',
                  render: r => <span className="font-bold text-slate-800 tabular-nums">{r.pin_count}</span>,
                },
              ]}
            />

            <LeaderTable<PoolTfRow>
              title="Most Tech Falls"
              description="Total TF and TF-1.5 wins"
              rows={d.mostTf}
              cols={[
                {
                  label: 'Wrestler', align: 'left',
                  render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
                },
                {
                  label: 'TFs', align: 'right',
                  render: r => <span className="font-bold text-slate-800 tabular-nums">{r.tf_count}</span>,
                },
              ]}
            />

            <LeaderTable<PoolBonusRow>
              title="Bonus Point Percentage"
              description="Bonus wins (FALL + TF + MD) ÷ total matches — min 3 matches"
              rows={d.mostBonus}
              cols={[
                {
                  label: 'Wrestler', align: 'left',
                  render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
                },
                {
                  label: 'Pct', align: 'right',
                  render: r => <span className="font-bold text-slate-800 tabular-nums">{r.total_wins > 0 ? `${(r.bonus_wins / r.total_wins * 100).toFixed(1)}%` : '—'}</span>,
                },
                {
                  label: 'W/M', align: 'right',
                  render: r => <span className="text-slate-500 tabular-nums text-xs">{r.bonus_wins}/{r.total_wins}</span>,
                },
              ]}
            />

            <LeaderTable<PoolDomRow>
              title="Hammer Rating"
              description="Avg score per match · wins score high, losses penalized · FORF/INJ/DQ excluded · min 3 wins"
              rows={d.poolDom}
              cols={[
                {
                  label: 'Wrestler', align: 'left',
                  render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
                },
                {
                  label: 'Wins', align: 'right',
                  render: r => <span className="text-slate-500 tabular-nums">{r.win_count}</span>,
                },
                {
                  label: 'Score', align: 'right',
                  render: r => <span className="font-bold text-slate-800 tabular-nums">{r.dominance_score}</span>,
                },
              ]}
            />

          </div>

          {/* The Terminators — full width */}
          <LeaderTable<PoolMatTimeRow>
            title="The Terminators"
            description="Total Tourney Mat Time"
            rows={d.matTime}
            cols={[
              {
                label: 'Wrestler', align: 'left',
                render: r => <PWCell id={r.wrestler_id} name={r.wrestler_name} school={r.school_name || r.school} />,
              },
              {
                label: 'Wins', align: 'right',
                render: r => <span className="text-slate-500 tabular-nums">{r.match_count}</span>,
              },
              {
                label: 'Total Time', align: 'right',
                render: r => (
                  <span className="font-bold text-slate-800 tabular-nums font-mono">
                    {fmtTime(r.total_seconds)}
                  </span>
                ),
              },
            ]}
          />

        </div>
      </section>

    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ d }: { d: AnalyticsData }) {
  const weights = [...d.weights].sort((a, b) => Number(a.avg_margin) - Number(b.avg_margin))

  return (
    <div className="space-y-10">

      <LeaderTable<DomRow>
        title="Hammer Rating"
        description="Avg score per match · wins score high, losses penalized · FORF/INJ/DQ excluded · min 3 wins"
        rows={d.dominance}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'Wins', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.win_count}</span>,
          },
          {
            label: 'Score', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.dominance_score}</span>,
          },
        ]}
      />

      <LeaderTable<ComebackRow>
        title="Backside Warriors"
        description="Most consolation bracket wins in a single tournament"
        rows={d.comebacks}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school_name || r.school} />,
          },
          {
            label: 'Cons. Wins', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.consol_wins}</span>,
          },
          {
            label: 'Tournament', align: 'left',
            render: r => <span className="text-slate-500 text-xs">{cleanTournament(r.tournament_name)}</span>,
          },
          {
            label: 'Wt', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.weight}</span>,
          },
        ]}
      />

      <LeaderTable<UpsetRow>
        title="Bracket Buster"
        description="Biggest upsets by seed differential — higher seed beats lower seed"
        rows={d.upsets}
        cols={[
          {
            label: 'Winner', align: 'left',
            render: r => <WrestlerCell id={r.winner_id} name={r.winner_name} school={r.winner_school} />,
          },
          {
            label: 'Seed', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">#{r.winner_seed}</span>,
          },
          {
            label: 'Over', align: 'left',
            render: r => <span className="text-slate-500 text-xs truncate">{r.loser_name} (#{r.loser_seed})</span>,
          },
          {
            label: 'Gap', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">+{r.seed_gap}</span>,
          },
          {
            label: 'Wt', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.weight}</span>,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <LeaderTable<DistrictRow>
          title="Region Strength"
          description="Regions ranked by wrestlers advancing to state"
          rows={d.districts}
          cols={[
            {
              label: 'Region', align: 'left',
              render: r => <span className="font-medium text-slate-800">{r.district_name}</span>,
            },
            {
              label: 'Advanced', align: 'right',
              render: r => <span className="font-bold text-slate-800 tabular-nums">{r.wrestlers_advancing}</span>,
            },
            {
              label: 'State', align: 'right',
              render: r => <span className="text-slate-500 tabular-nums">{r.state_qualifiers}</span>,
            },
          ]}
        />

        <LeaderTable<SchoolRow>
          title="School Depth"
          description="Schools with the most weight classes having a regions winner"
          rows={d.schools}
          cols={[
            {
              label: 'School', align: 'left',
              render: r => <span className="font-medium text-slate-800">{fmtSchool(r.school)}</span>,
            },
            {
              label: 'Weights', align: 'right',
              render: r => <span className="font-bold text-slate-800 tabular-nums">{r.weight_classes_placed}</span>,
            },
            {
              label: 'Wrestlers', align: 'right',
              render: r => <span className="text-slate-500 tabular-nums">{r.wrestlers}</span>,
            },
          ]}
        />

      </div>

      <section>
        <SectionHeader
          title="The Margins"
          description="Average score margin in decision matches (DEC + MD) — lower = tighter competition"
        />
        <div className="max-w-sm">
          <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Weight</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Avg Margin</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Matches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weights.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-400 text-xs">No data</td>
                  </tr>
                ) : (
                  weights.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800 tabular-nums">{r.weight} lb</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={`font-bold ${
                          Number(r.avg_margin) <= 3 ? 'text-emerald-600' :
                          Number(r.avg_margin) <= 6 ? 'text-amber-600' : 'text-slate-700'
                        }`}>
                          +{r.avg_margin}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{r.match_count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  )
}
