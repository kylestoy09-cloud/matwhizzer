import { supabase } from '@/lib/supabase'
import {
  LeaderTable, WrestlerCell, TabNav, SectionHeader,
  fmtTime, fmtSchool, cleanTournament, COMEBACK_ROUND_LABEL,
  type PinRow, type FastPinRow, type TfRow, type MdRow,
  type WinPctRow, type BonusRow,
  type DomRow, type DistrictRow, type SchoolRow,
  type WeightRow, type ComebackRow,
} from '@/components/leaderboard-ui'

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GirlsLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'wrestlers' } = await searchParams
  const isAnalytics = tab === 'analytics'

  const data = isAnalytics ? await fetchAnalytics() : await fetchWrestlers()

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rose-900">Girls Leaderboards</h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 girls postseason — regions &amp; state</p>
      </div>

      <TabNav active={tab} basePath="/girls/leaderboards" />

      {!isAnalytics ? (
        <WrestlerTab d={data as WrestlerData} />
      ) : (
        <AnalyticsTab d={data as AnalyticsData} />
      )}
    </div>
  )
}

// ── Data fetching ─────────────────────────────────────────────────────────────

type WrestlerData = {
  pins:    PinRow[]
  fastPin: FastPinRow[]
  tfs:     TfRow[]
  mds:     MdRow[]
  winPct:  WinPctRow[]
  bonus:   BonusRow[]
}

type AnalyticsData = {
  dominance:  DomRow[]
  districts:  DistrictRow[]
  schools:    SchoolRow[]
  weights:    WeightRow[]
  comebacks:  ComebackRow[]
}

async function fetchWrestlers(): Promise<WrestlerData> {
  const [
    { data: pins },
    { data: fastPin },
    { data: tfs },
    { data: mds },
    { data: winPct },
    { data: bonus },
  ] = await Promise.all([
    supabase.rpc('lb_most_pins',      { p_gender: 'F' }),
    supabase.rpc('lb_fastest_pin',    { p_gender: 'F' }),
    supabase.rpc('lb_most_techfalls', { p_gender: 'F' }),
    supabase.rpc('lb_most_md',        { p_gender: 'F' }),
    supabase.rpc('lb_win_pct',        { p_gender: 'F' }),
    supabase.rpc('lb_bonus_wins',     { p_gender: 'F' }),
  ])
  return {
    pins:    (pins    ?? []) as PinRow[],
    fastPin: (fastPin ?? []) as FastPinRow[],
    tfs:     (tfs     ?? []) as TfRow[],
    mds:     (mds     ?? []) as MdRow[],
    winPct:  (winPct  ?? []) as WinPctRow[],
    bonus:   (bonus   ?? []) as BonusRow[],
  }
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const [
    { data: dominance },
    { data: districts },
    { data: schools },
    { data: weights },
    { data: comebacks },
  ] = await Promise.all([
    supabase.rpc('lb_dominance',              { p_gender: 'F' }),
    supabase.rpc('lb_district_strength',      { p_gender: 'F' }),
    supabase.rpc('lb_school_depth',           { p_gender: 'F' }),
    supabase.rpc('lb_weight_competitiveness', { p_gender: 'F' }),
    supabase.rpc('lb_comebacks',              { p_gender: 'F' }),
  ])
  return {
    dominance:  (dominance  ?? []) as DomRow[],
    districts:  (districts  ?? []) as DistrictRow[],
    schools:    (schools    ?? []) as SchoolRow[],
    weights:    (weights    ?? []) as WeightRow[],
    comebacks:  (comebacks  ?? []) as ComebackRow[],
  }
}

// ── Wrestler tab ──────────────────────────────────────────────────────────────

function WrestlerTab({ d }: { d: WrestlerData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      <LeaderTable<PinRow>
        title="Most Pins"
        description="Total FALL wins across all girls postseason tournaments"
        rows={d.pins}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'Pins', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.pin_count}</span>,
          },
        ]}
      />

      <LeaderTable<TfRow>
        title="Most Tech Falls"
        description="TF and TF-1.5 wins across all girls postseason tournaments"
        rows={d.tfs}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'TFs', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.tf_count}</span>,
          },
        ]}
      />

      <LeaderTable<FastPinRow>
        title="Fastest Pin"
        description="Single fastest fall time"
        rows={d.fastPin}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'Pins', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.pin_count}</span>,
          },
          {
            label: 'Fastest', align: 'right',
            render: r => (
              <span className="font-bold text-slate-800 tabular-nums font-mono">
                {fmtTime(Number(r.fastest_seconds))}
              </span>
            ),
          },
        ]}
      />

      <LeaderTable<MdRow>
        title="Most Major Decisions"
        description="MD wins (8–14 point margin) across all girls postseason tournaments"
        rows={d.mds}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'MDs', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.md_count}</span>,
          },
        ]}
      />

      <LeaderTable<WinPctRow>
        title="Best Win Percentage"
        description="Win % across all girls postseason matches — minimum 5 matches"
        rows={d.winPct}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'W-L', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.wins}-{Number(r.total) - Number(r.wins)}</span>,
          },
          {
            label: 'Pct', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.win_pct}%</span>,
          },
        ]}
      />

      <LeaderTable<BonusRow>
        title="Most Bonus-Point Wins"
        description="FALL + TF + TF-1.5 + MD wins combined"
        rows={d.bonus}
        cols={[
          {
            label: 'Wrestler', align: 'left',
            render: r => <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />,
          },
          {
            label: 'Bonus', align: 'right',
            render: r => <span className="font-bold text-slate-800 tabular-nums">{r.bonus_count}</span>,
          },
          {
            label: 'of', align: 'right',
            render: r => <span className="text-slate-500 tabular-nums">{r.total_wins}</span>,
          },
        ]}
      />

    </div>
  )
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ d }: { d: AnalyticsData }) {
  const weights = [...d.weights].sort((a, b) => a.weight - b.weight)

  return (
    <div className="space-y-10">

      <LeaderTable<DomRow>
        title="Dominance Score"
        description="Average margin per win (DEC/MD = score diff · TF = score diff · FALL = time remaining × 15/360) — min 5 wins"
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

      <section>
        <SectionHeader
          title="Comeback Tracking"
          description="Wrestlers who lost in early consolation (C1 or C2) but still placed 3rd or 5th"
        />
        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-500">Wrestler</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500">Lost In</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500">Placed</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500">Tournament</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-14">Lbs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.comebacks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-400 text-xs">No data</td>
                </tr>
              ) : (
                d.comebacks.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <WrestlerCell id={r.wrestler_id} name={r.name} school={r.school} />
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{COMEBACK_ROUND_LABEL[r.lost_round] ?? r.lost_round}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.placed_round === '3rd_Place'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {COMEBACK_ROUND_LABEL[r.placed_round] ?? r.placed_round}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{cleanTournament(r.tournament_name)}</td>
                    <td className="px-3 py-2 text-right text-slate-500 tabular-nums text-xs">{r.weight}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
          title="Weight Class Competitiveness"
          description="Average score margin in decision matches (DEC + MD) — lower = tighter competition"
        />
        <div className="max-w-sm">
          <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
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
