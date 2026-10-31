'use client'

import { useState } from 'react'
import type {
  SnapshotPayload, SectionData, SectionScope,
  StreakRow, SnappedStreakRow, RatedMatchRow, UpsetByGapRow,
  TeamRankEntry, TeamUpsetRow, FinalBoutRow,
  SpeedRecord, TeamStoppageRow, TeamBonusPctRow,
  TeamScoreRow, TeamMarginRow, FirstWinRow, DualMatTimeRow,
  TournamentsData, TeamSeasonHighRow, SeasonHighsBundle,
} from '@/lib/snapshot/types'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SECTION_SCOPE_NAMES } from '@/lib/snapshot/types'
import { RATING_SHORT } from '@/lib/rating'

// ── Utils ─────────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

// ── Base table ────────────────────────────────────────────────────────────────

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {headers.map(h => (
              <th key={h} className="px-3 py-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function TR({ children, star }: { children: React.ReactNode; star?: boolean }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      {star && <td className="px-1 py-1 text-yellow-500 text-xs">★</td>}
      {children}
    </tr>
  )
}

function TD({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-1 ${mono ? 'font-mono text-xs' : 'text-sm'} text-slate-800 whitespace-nowrap`}>{children ?? '—'}</td>
}

function Empty({ msg }: { msg?: string }) {
  return <p className="text-xs text-slate-400 py-1">{msg ?? 'None today'}</p>
}

// ── Panel with optional Today / Season toggle ─────────────────────────────────

function Panel({
  title, children, badge, seasonContent,
}: {
  title: string
  children: React.ReactNode
  badge?: string
  seasonContent?: React.ReactNode
}) {
  const [view, setView] = useState<'today' | 'season'>('today')
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
      <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        {badge && (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{badge}</span>
        )}
        {seasonContent != null && (
          <div className="ml-auto flex rounded overflow-hidden border border-slate-200 text-xs">
            <button
              onClick={() => setView('today')}
              className={`px-2 py-0.5 transition-colors ${view === 'today' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >Today</button>
            <button
              onClick={() => setView('season')}
              className={`px-2 py-0.5 transition-colors ${view === 'season' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >Season</button>
          </div>
        )}
      </div>
      <div className="p-3">
        {seasonContent == null || view === 'today' ? children : seasonContent}
      </div>
    </div>
  )
}

// ── Season high display helpers ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScalarHigh = { value: number; context: Record<string, any>; set_on: string }

function ScalarHighCard({ stat, fmt }: { stat: ScalarHigh | undefined; fmt?: (v: number) => string }) {
  if (!stat) return <Empty msg="No season high yet" />
  const display = fmt ? fmt(stat.value) : String(stat.value)
  return (
    <div className="text-sm text-slate-700 flex flex-wrap gap-4 py-1">
      <div><span className="text-slate-400 text-xs block">Season Best</span><span className="font-mono font-bold text-lg">{display}</span></div>
      {stat.context.wrestler  && <div><span className="text-slate-400 text-xs block">Wrestler</span>{stat.context.wrestler as string}</div>}
      {stat.context.school    && <div><span className="text-slate-400 text-xs block">School</span>{stat.context.school as string}</div>}
      {stat.context.school1   && <div><span className="text-slate-400 text-xs block">School 1</span>{stat.context.school1 as string}</div>}
      {stat.context.school2   && <div><span className="text-slate-400 text-xs block">School 2</span>{stat.context.school2 as string}</div>}
      {stat.context.winner    && <div><span className="text-slate-400 text-xs block">Winner</span>{stat.context.winner as string}</div>}
      {stat.context.loser     && <div><span className="text-slate-400 text-xs block">Loser</span>{stat.context.loser as string}</div>}
      <div><span className="text-slate-400 text-xs block">Date</span><span className="font-mono text-xs">{stat.set_on}</span></div>
    </div>
  )
}

function TeamHighStoppageTable({ rows }: { rows: TeamSeasonHighRow[] }) {
  if (rows.length === 0) return <Empty msg="No season high yet" />
  return (
    <Table headers={['School', 'Count', 'Avg Time', 'Date']}>
      {rows.map(r => (
        <TR key={r.school_id}>
          <TD>{r.school_name}</TD>
          <TD mono>{r.best_value}</TD>
          <TD mono>{r.avg_time_sec != null ? fmtTime(r.avg_time_sec) : '—'}</TD>
          <TD mono>{r.best_on}</TD>
        </TR>
      ))}
    </Table>
  )
}

function TeamHighBonusPctTable({ rows }: { rows: TeamSeasonHighRow[] }) {
  if (rows.length === 0) return <Empty msg="No season high yet" />
  return (
    <Table headers={['School', 'Bonus%', 'Bonus', 'Bouts', 'Pins', 'Techs', 'Date']}>
      {rows.map(r => (
        <TR key={r.school_id}>
          <TD>{r.school_name}</TD>
          <TD mono>{pct(r.best_value)}</TD>
          <TD mono>{r.bonus_wins ?? '—'}</TD>
          <TD mono>{r.total_bouts ?? '—'}</TD>
          <TD mono>{r.pins ?? '—'}</TD>
          <TD mono>{r.techs ?? '—'}</TD>
          <TD mono>{r.best_on}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Streaks ───────────────────────────────────────────────────────────────────

function StreakTable({ rows, label }: { rows: StreakRow[]; label: string }) {
  if (rows.length === 0) return <Empty msg={`No active ${label} streaks`} />
  return (
    <Table headers={['Wrestler', 'School', 'Streak', 'Season Hi']}>
      {rows.map(r => (
        <TR key={r.wrestler_id}>
          <TD>{r.wrestler_name}</TD>
          <TD>{r.school_name}</TD>
          <TD mono>{r.streak_len}</TD>
          <TD mono>{r.season_high}</TD>
        </TR>
      ))}
    </Table>
  )
}

function SnappedTable({ rows, label }: { rows: SnappedStreakRow[]; label: string }) {
  if (rows.length === 0) return <Empty msg={`No ${label} streaks snapped today`} />
  return (
    <Table headers={['Wrestler', 'School', 'Was', 'Ended By']}>
      {rows.map(r => (
        <TR key={r.wrestler_id}>
          <TD>{r.wrestler_name}</TD>
          <TD>{r.school_name}</TD>
          <TD mono>{r.streak_was}</TD>
          <TD>{r.result_type}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Rated matches ─────────────────────────────────────────────────────────────

function RatedMatchTable({ rows }: { rows: RatedMatchRow[] }) {
  if (rows.length === 0) return <Empty />
  return (
    <Table headers={['Wt', 'Winner', 'School', 'Loser', 'School', `W ${RATING_SHORT}`, `L ${RATING_SHORT}`, 'Combined', 'Result']}>
      {rows.map((r, i) => (
        <TR key={i}>
          <TD mono>{r.weight_class}</TD>
          <TD>{r.winner_name}</TD>
          <TD>{r.winner_school}</TD>
          <TD>{r.loser_name}</TD>
          <TD>{r.loser_school}</TD>
          <TD mono>{r.winner_hammer.toFixed(1)}</TD>
          <TD mono>{r.loser_hammer.toFixed(1)}</TD>
          <TD mono>{r.combined.toFixed(1)}</TD>
          <TD>{r.result_type}</TD>
        </TR>
      ))}
    </Table>
  )
}

function UpsetByGapTable({ rows }: { rows: UpsetByGapRow[] }) {
  if (rows.length === 0) return <Empty />
  return (
    <Table headers={['Wt', 'Winner', 'School', 'Loser', 'School', 'Winner H', 'Loser H', 'Gap', 'Result']}>
      {rows.map((r, i) => (
        <TR key={i}>
          <TD mono>{r.weight_class}</TD>
          <TD>{r.winner_name}</TD>
          <TD>{r.winner_school}</TD>
          <TD>{r.loser_name}</TD>
          <TD>{r.loser_school}</TD>
          <TD mono>{r.winner_hammer.toFixed(1)}</TD>
          <TD mono>{r.loser_hammer.toFixed(1)}</TD>
          <TD mono><span className="text-orange-600 font-semibold">{r.gap.toFixed(1)}</span></TD>
          <TD>{r.result_type}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Top 25 teams ──────────────────────────────────────────────────────────────

function Top25Table({ rows }: { rows: TeamRankEntry[] }) {
  if (rows.length === 0) return <Empty msg="Rankings not yet available" />
  return (
    <Table headers={['Rank', 'School', 'Score', "Today's Result"]}>
      {rows.map(r => (
        <TR key={r.school_id}>
          <TD mono>{r.rank}</TD>
          <TD>{r.school_name}</TD>
          <TD mono>{r.score?.toFixed ? r.score.toFixed(1) : r.score}</TD>
          <TD>{r.meet_result ?? '—'}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Team upsets ───────────────────────────────────────────────────────────────

function TeamUpsetTable({ rows }: { rows: TeamUpsetRow[] }) {
  if (rows.length === 0) return <Empty msg="No ranked team upsets today" />
  return (
    <Table headers={['Winner', 'Rank', 'Loser', 'Rank', 'Score', 'Rank Gap']}>
      {rows.map((r, i) => (
        <TR key={i}>
          <TD>{r.winner_school_name}</TD>
          <TD mono>#{r.winner_rank}</TD>
          <TD>{r.loser_school_name}</TD>
          <TD mono>#{r.loser_rank}</TD>
          <TD mono>{r.score}</TD>
          <TD mono>{r.rank_gap}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Final bout wins ───────────────────────────────────────────────────────────

function FinalBoutTable({ rows }: { rows: FinalBoutRow[] }) {
  if (rows.length === 0) return <Empty msg="No clutch final-bout wins today" />
  return (
    <Table headers={['Winner', 'Loser', 'Score', 'Last Wt', 'Last Winner', 'Result']}>
      {rows.map((r, i) => (
        <TR key={i}>
          <TD>{r.winning_school}</TD>
          <TD>{r.losing_school}</TD>
          <TD mono>{r.score}</TD>
          <TD mono>{r.last_weight_class}</TD>
          <TD>{r.last_winner_name}</TD>
          <TD>{r.last_result_type}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Speed records ─────────────────────────────────────────────────────────────

function SpeedCard({ recs, label }: { recs: SpeedRecord[]; label: string }) {
  if (recs.length === 0) return <Empty msg={`No ${label} today`} />
  return (
    <Table headers={['#', 'Time', 'Wrestler', 'School', 'Opponent', 'Wt']}>
      {recs.map((rec, i) => (
        <TR key={i}>
          <TD mono>{i + 1}</TD>
          <TD mono>
            <span className="font-bold">{fmtTime(rec.fall_time_sec)}</span>
            {rec.season_high && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">SH</span>}
          </TD>
          <TD>{rec.wrestler_name}</TD>
          <TD>{rec.school_name}</TD>
          <TD>{rec.opponent_name}</TD>
          <TD mono>{rec.weight_class}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Team stoppage rows ────────────────────────────────────────────────────────

function StoppageTable({ rows, label }: { rows: TeamStoppageRow[]; label: string }) {
  if (rows.length === 0) return <Empty msg={`No ${label} today`} />
  return (
    <Table headers={['School', 'Count', 'Avg Time']}>
      {rows.map(r => (
        <TR key={r.school_id}>
          <TD>{r.school_name}</TD>
          <TD mono>{r.count}</TD>
          <TD mono>{r.avg_time_sec != null ? fmtTime(r.avg_time_sec) : '—'}</TD>
        </TR>
      ))}
    </Table>
  )
}

function BonusPctTable({ rows }: { rows: TeamBonusPctRow[] }) {
  if (rows.length === 0) return <Empty />
  return (
    <Table headers={['School', 'Bonus%', 'Bonus', 'Bouts', 'Pins', 'Techs']}>
      {rows.map(r => (
        <TR key={r.school_id}>
          <TD>{r.school_name}</TD>
          <TD mono>{pct(r.bonus_pct)}</TD>
          <TD mono>{r.bonus_wins}</TD>
          <TD mono>{r.total_bouts}</TD>
          <TD mono>{r.pins}</TD>
          <TD mono>{r.techs}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Score / margin ────────────────────────────────────────────────────────────

function ScoreCard({ row, label }: { row: TeamScoreRow | null; label: string }) {
  if (!row) return <Empty msg={`No data for ${label}`} />
  return (
    <div className="text-sm text-slate-700 flex flex-wrap gap-4">
      <div><span className="text-slate-400 text-xs">School</span><br />{row.school_name}</div>
      <div><span className="text-slate-400 text-xs">Score</span><br /><span className="font-mono font-bold text-lg">{row.score}</span></div>
      {row.opponent && <div><span className="text-slate-400 text-xs">Opponent</span><br />{row.opponent}</div>}
      <div><span className="text-slate-400 text-xs">Final</span><br /><span className="font-mono">{row.meet_score}</span></div>
    </div>
  )
}

function MarginCard({ row }: { row: TeamMarginRow | null }) {
  if (!row) return <Empty />
  return (
    <div className="text-sm text-slate-700 flex flex-wrap gap-4">
      <div><span className="text-slate-400 text-xs">Winner</span><br />{row.winner_school}</div>
      <div>
        <span className="text-slate-400 text-xs">Margin</span><br />
        <span className="font-mono font-bold text-lg">{row.margin}</span>
        {row.season_high && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">SH</span>}
      </div>
      <div><span className="text-slate-400 text-xs">Loser</span><br />{row.loser_school}</div>
      <div><span className="text-slate-400 text-xs">Score</span><br /><span className="font-mono">{row.score}</span></div>
    </div>
  )
}

// ── First wins ────────────────────────────────────────────────────────────────

function FirstWinsTable({ rows, showStar }: { rows: FirstWinRow[]; showStar?: boolean }) {
  if (rows.length === 0) return <Empty />
  return (
    <Table headers={['Wrestler', 'School', 'Wt', 'Opponent', `Opp ${RATING_SHORT}`, 'Result']}>
      {rows.map((r, i) => (
        <TR key={i} star={showStar && r.truly_first_match}>
          <TD>{r.wrestler_name}</TD>
          <TD>{r.school_name}</TD>
          <TD mono>{r.weight_class}</TD>
          <TD>{r.opponent_name}</TD>
          <TD mono>{r.opponent_hammer.toFixed(1)}</TD>
          <TD>{r.result_type}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Dual mat times ────────────────────────────────────────────────────────────

function DualTimeTable({ rows }: { rows: DualMatTimeRow[] }) {
  if (rows.length === 0) return <Empty msg="No dual meets today" />
  return (
    <Table headers={['School 1', 'School 2', 'Mat Time', 'Bouts', 'Allotted', 'Pct Used']}>
      {rows.map((r, i) => (
        <TR key={i}>
          <TD>{r.school1}</TD>
          <TD>{r.school2}</TD>
          <TD mono>
            {fmtTime(r.total_seconds)}
            {r.season_high && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">SH</span>}
          </TD>
          <TD mono>{r.bout_count}</TD>
          <TD mono>{fmtTime(r.allotted_seconds)}</TD>
          <TD mono>{pct(r.total_seconds / r.allotted_seconds)}</TD>
        </TR>
      ))}
    </Table>
  )
}

// ── Tournaments tab ───────────────────────────────────────────────────────────

function TournamentsPanel({ data }: { data: TournamentsData }) {
  return (
    <div className="space-y-4">
      <Panel title={`Top Champions by Combined Opponent ${RATING_SHORT}`} badge="Top 10">
        {data.top_champs.length === 0
          ? <Empty msg="No tournament data today" />
          : <Table headers={['Tournament', 'Wt', 'Champion', 'School', `Opp ${RATING_SHORT}`]}>
              {data.top_champs.map((r, i) => (
                <TR key={i}>
                  <TD>{r.tournament_name}</TD>
                  <TD mono>{r.weight_class}</TD>
                  <TD>{r.wrestler_name}</TD>
                  <TD>{r.school_name}</TD>
                  <TD mono>{r.combined_opp_hammer.toFixed(1)}</TD>
                </TR>
              ))}
            </Table>
        }
      </Panel>

      <Panel title="Lowest Seeds to Win (Champions)">
        {data.lowest_seed_wins.length === 0
          ? <Empty msg="No seeded champions today" />
          : <Table headers={['Tournament', 'Wt', 'Wrestler', 'School', 'Seed']}>
              {data.lowest_seed_wins.map((r, i) => (
                <TR key={i}>
                  <TD>{r.tournament_name}</TD>
                  <TD mono>{r.weight_class}</TD>
                  <TD>{r.wrestler_name}</TD>
                  <TD>{r.school_name}</TD>
                  <TD mono>#{r.seed}</TD>
                </TR>
              ))}
            </Table>
        }
      </Panel>

      <Panel title="Total Mat Time by Tournament">
        {data.mat_times.length === 0
          ? <Empty msg="No tournament mat time data" />
          : <Table headers={['Tournament', 'Total Time', 'Bouts', 'Avg / Bout']}>
              {data.mat_times.sort((a, b) => a.total_seconds - b.total_seconds).map((r, i) => (
                <TR key={i}>
                  <TD>{r.tournament_name}</TD>
                  <TD mono>{fmtTime(r.total_seconds)}</TD>
                  <TD mono>{r.bout_count}</TD>
                  <TD mono>{fmtTime(r.avg_seconds)}</TD>
                </TR>
              ))}
            </Table>
        }
      </Panel>

      <Panel title={`Biggest Upset (by ${RATING_SHORT} Gap)`}>
        {data.biggest_upset == null
          ? <Empty msg="No tournament upset data" />
          : <div className="text-sm text-slate-700 flex flex-wrap gap-4">
              <div><span className="text-slate-400 text-xs">Tournament</span><br />{data.biggest_upset.tournament_name}</div>
              <div><span className="text-slate-400 text-xs">Weight</span><br />{data.biggest_upset.weight_class}</div>
              <div><span className="text-slate-400 text-xs">Winner</span><br />{data.biggest_upset.winner_name} ({data.biggest_upset.winner_school})</div>
              <div><span className="text-slate-400 text-xs">Loser</span><br />{data.biggest_upset.loser_name} ({data.biggest_upset.loser_school})</div>
              <div><span className="text-slate-400 text-xs">{RATING_SHORT} Gap</span><br /><span className="font-mono font-bold text-orange-600">{data.biggest_upset.gap.toFixed(1)}</span></div>
              <div><span className="text-slate-400 text-xs">Result</span><br />{data.biggest_upset.result_type}</div>
            </div>
        }
      </Panel>
    </div>
  )
}

// ── Section data panels ───────────────────────────────────────────────────────

function SectionPanel({ data, highs }: { data: SectionData; highs: SeasonHighsBundle | null }) {
  const sh = highs?.scalar ?? {}
  const th = highs?.team ?? { pins: [], techs: [], combined: [], bonus_pct: [] }

  return (
    <div className="space-y-4">
      {/* Streaks */}
      <Panel title="Active Streaks — Pins"
        seasonContent={<ScalarHighCard stat={sh['longest_pin_streak'] as ScalarHigh | undefined} />}>
        <StreakTable rows={data.streaks.pin} label="pin" />
      </Panel>
      <Panel title="Active Streaks — Techs"
        seasonContent={<ScalarHighCard stat={sh['longest_tech_streak'] as ScalarHigh | undefined} />}>
        <StreakTable rows={data.streaks.tech} label="tech" />
      </Panel>
      <Panel title="Active Streaks — Bonus Wins"
        seasonContent={<ScalarHighCard stat={sh['longest_bonus_streak'] as ScalarHigh | undefined} />}>
        <StreakTable rows={data.streaks.bonus} label="bonus" />
      </Panel>
      <Panel title="Active Streaks — Wins"
        seasonContent={<ScalarHighCard stat={sh['longest_win_streak'] as ScalarHigh | undefined} />}>
        <StreakTable rows={data.streaks.win} label="win" />
      </Panel>

      <Panel title="Snapped Streaks — Pins">
        <SnappedTable rows={data.snapped.pin} label="pin" />
      </Panel>
      <Panel title="Snapped Streaks — Techs">
        <SnappedTable rows={data.snapped.tech} label="tech" />
      </Panel>
      <Panel title="Snapped Streaks — Bonus Wins">
        <SnappedTable rows={data.snapped.bonus} label="bonus" />
      </Panel>

      {/* Top rated matches */}
      <Panel title="Top 10 Highest-Rated Matches" badge={`by combined ${RATING_SHORT}`}>
        <RatedMatchTable rows={data.top_rated_matches} />
      </Panel>
      <Panel title="Top 10 Highest-Rated Upsets" badge={`by loser ${RATING_SHORT}`}>
        <RatedMatchTable rows={data.top_rated_upsets} />
      </Panel>
      <Panel title={`Top 10 Upsets by ${RATING_SHORT} Gap`}>
        <UpsetByGapTable rows={data.top_upsets_by_gap} />
      </Panel>

      {/* Rankings */}
      <Panel title="Top 25 Teams">
        <Top25Table rows={data.top25_teams} />
      </Panel>

      {/* Team upsets */}
      <Panel title="Team Upsets" badge="higher-ranked team lost">
        <TeamUpsetTable rows={data.team_upsets} />
      </Panel>

      {/* Final bout victories */}
      <Panel title="Final Bout Victories" badge="≤6pt margin duals">
        <FinalBoutTable rows={data.final_bout_wins} />
      </Panel>

      {/* Speed */}
      <Panel title="Fastest Pin" badge="Top 3"
        seasonContent={<ScalarHighCard stat={sh['fastest_pin'] as ScalarHigh | undefined} fmt={fmtTime} />}>
        <SpeedCard recs={data.fastest_pin} label="pins" />
      </Panel>
      <Panel title="Fastest Tech Fall" badge="Top 3"
        seasonContent={<ScalarHighCard stat={sh['fastest_tech'] as ScalarHigh | undefined} fmt={fmtTime} />}>
        <SpeedCard recs={data.fastest_tech} label="tech falls" />
      </Panel>

      {/* Team stoppages — season high uses per-school accumulator table */}
      <Panel title="Most Pins in a Match" badge="Top 3 teams"
        seasonContent={<TeamHighStoppageTable rows={th.pins.slice(0, 3)} />}>
        <StoppageTable rows={data.team_pins} label="pins" />
      </Panel>
      <Panel title="Most Tech Falls in a Match" badge="Top 3 teams"
        seasonContent={<TeamHighStoppageTable rows={th.techs.slice(0, 3)} />}>
        <StoppageTable rows={data.team_techs} label="tech falls" />
      </Panel>
      <Panel title="Most Combined Stoppages in a Match" badge="pins + techs"
        seasonContent={
          <Table headers={['School', 'Count', 'Pins', 'Techs', 'Avg Time', 'Date']}>
            {th.combined.slice(0, 3).map(r => (
              <TR key={r.school_id}>
                <TD>{r.school_name}</TD>
                <TD mono>{r.best_value}</TD>
                <TD mono>{r.pins ?? '—'}</TD>
                <TD mono>{r.techs ?? '—'}</TD>
                <TD mono>{r.avg_time_sec != null ? fmtTime(r.avg_time_sec) : '—'}</TD>
                <TD mono>{r.best_on}</TD>
              </TR>
            ))}
          </Table>
        }>
        <StoppageTable rows={data.team_combined_stops} label="stoppages" />
      </Panel>
      <Panel title="Highest Bonus Win %" badge="Top 3 teams"
        seasonContent={<TeamHighBonusPctTable rows={th.bonus_pct.slice(0, 3)} />}>
        <BonusPctTable rows={data.team_bonus_pct} />
      </Panel>

      {/* Scoring */}
      <Panel title="Most Points — Single Team"
        seasonContent={<ScalarHighCard stat={sh['most_points_single'] as ScalarHigh | undefined} />}>
        <ScoreCard row={data.most_points_single} label="single team" />
      </Panel>
      <Panel title="Most Points — Combined"
        seasonContent={<ScalarHighCard stat={sh['most_points_combined'] as ScalarHigh | undefined} />}>
        <ScoreCard row={data.most_points_combined} label="combined" />
      </Panel>
      <Panel title="Largest Margin of Victory"
        seasonContent={<ScalarHighCard stat={sh['largest_margin'] as ScalarHigh | undefined} />}>
        <MarginCard row={data.largest_margin} />
      </Panel>

      {/* First wins */}
      <Panel title="First Career Wins" badge="★ = first ever match too">
        <FirstWinsTable rows={data.first_career_wins} showStar />
      </Panel>
      <Panel title="First Career Match Wins" badge="0 wins AND 0 losses before today">
        <FirstWinsTable rows={data.first_career_matches} />
      </Panel>

      {/* Dual mat time */}
      <Panel title="Fastest Duals" badge="Top 3 by total mat time"
        seasonContent={<ScalarHighCard stat={sh['fastest_dual'] as ScalarHigh | undefined} fmt={fmtTime} />}>
        <DualTimeTable rows={data.fastest_duals} />
      </Panel>
    </div>
  )
}

// ── Main client component ─────────────────────────────────────────────────────

const TABS = [
  { id: 'state',       label: 'State' },
  { id: 'north_i',     label: 'North I' },
  { id: 'north_ii',    label: 'North II' },
  { id: 'central',     label: 'Central' },
  { id: 'south',       label: 'South' },
  { id: 'tournaments', label: 'Tournaments' },
] as const

type TabId = typeof TABS[number]['id']

type Season = { id: number; label: string }

export function SnapshotClient({ seasons, gender }: { seasons: Season[]; gender: 'M' | 'F' }) {
  const apiPath = gender === 'M' ? '/api/admin/snapshot' : '/api/admin/snapshot-girls'
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [seasonId, setSeasonId] = useState<number>(seasons[0]?.id ?? 0)
  const [tab, setTab] = useState<TabId>('state')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<SnapshotPayload | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [seasonHighs, setSeasonHighs] = useState<SeasonHighsBundle | null>(null)

  const selectedSeason = seasons.find(s => s.id === seasonId)

  async function load() {
    setLoading(true); setError(null)
    const res = await fetch(`${apiPath}?date=${date}`)
    if (res.ok) {
      const data = await res.json()
      setPayload(data.payload)
      setComputedAt(data.computed_at)
      setSeasonHighs(data.season_highs ?? null)
    } else {
      setPayload(null)
      setComputedAt(null)
      setSeasonHighs(null)
      if (res.status !== 404) setError((await res.json()).error ?? 'Load failed')
    }
    setLoading(false)
  }

  async function compute() {
    if (!seasonId) { setError('Select a season first'); return }
    setLoading(true); setError(null)
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, season: selectedSeason?.label ?? '', seasonId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Compute failed'); setLoading(false); return }
    await load()
  }

  const sectionData = payload
    ? (tab === 'tournaments' ? null : payload[tab as Exclude<TabId, 'tournaments'>])
    : null

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Season</label>
          <select
            value={seasonId}
            onChange={e => setSeasonId(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-1.5 text-sm font-medium bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          Load
        </button>
        <button
          onClick={compute}
          disabled={loading}
          className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Computing…' : 'Compute & Save'}
        </button>
        {computedAt && (
          <p className="text-xs text-slate-400">Computed {new Date(computedAt).toLocaleString()}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {!payload && !loading && (
        <div className="text-slate-400 text-sm py-8 text-center">
          Select a date and click <strong>Load</strong> to view an existing snapshot, or <strong>Compute & Save</strong> to generate a new one.
        </div>
      )}

      {payload && (
        <div>
          {/* Section tabs */}
          <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'tournaments' && <TournamentsPanel data={payload.tournaments} />}
          {tab !== 'tournaments' && sectionData && <SectionPanel data={sectionData} highs={seasonHighs} />}
        </div>
      )}
    </div>
  )
}
