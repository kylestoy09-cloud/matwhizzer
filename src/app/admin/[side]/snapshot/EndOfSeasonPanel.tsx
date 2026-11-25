'use client'
// Snap Shot → End of Season (Kyle 2026-11-11): the season's totals, NJSIAA vs non-NJSIAA, the daily categories
// over the whole season and the postseason, for one side. Load shows the saved report; Compute & Save rebuilds
// it (src/lib/snapshot/seasonReport.ts). Postseason numbers come from the brackets.

import { useState, type ReactNode } from 'react'
import { RESULT_ORDER, TOUGH_MIN_MATCHES, type SeasonReport } from '@/lib/snapshot/seasonReport'
import { RATING_SHORT } from '@/lib/rating'

type Season = { id: number; label: string }

const n = (v: number | undefined) => (v ?? 0).toLocaleString()
const pctOf = (a: number, b: number) => (b ? `${(a / b * 100).toFixed(1)}%` : '—')
const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })

function Card({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-4">
      <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2">
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        {badge && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
      </div>
      <div className="p-2">{children}</div>
    </div>
  )
}

function Rows({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="text-xs text-slate-400 px-3 py-1">None this season</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-200">{headers.map((h, i) => <th key={i} className="px-3 py-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-b border-slate-100">{r.map((c, j) => <td key={j} className="px-3 py-1 text-slate-800 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-slate-200 rounded-lg px-4 py-3 bg-white">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function Report({ r }: { r: SeasonReport }) {
  const t = r.totals, v = r.vs_non_njsiaa, p = r.postseason, b = r.bests
  const e = t.events // missing on reports saved before 2026-11-11's event counts
  const srcTotal = (k: 'duals' | 'tournaments' | 'postseason') => RESULT_ORDER.reduce((s, c) => s + (t.by_source[k][c] ?? 0), 0)
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900 mb-3">Season Totals</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="NJ schools" value={n(t.schools_nj)} sub={`+${n(t.schools_other)} non-NJSIAA opponents`} />
        <Stat label="NJ wrestlers" value={n(t.wrestlers_nj)} sub={`+${n(t.wrestlers_other)} non-NJSIAA`} />
        <Stat label="Matches" value={n(t.matches)} sub={`${n(srcTotal('duals'))} dual · ${n(srcTotal('tournaments'))} tournament · ${n(srcTotal('postseason'))} postseason`} />
        <Stat label="Daily reports" value={n(b.daily_reports)} />
        {e && <Stat label="Duals" value={n(e.duals)} sub={e.jamborees ? `+${n(e.jamborees)} jamborees (${n(e.jamboree_pairings)} pairings)` : undefined} />}
        {e && <Stat label="Tournaments" value={n(e.tournaments)} sub="in-season" />}
        {e && <Stat label="Postseason tournaments" value={n(e.postseason.district + e.postseason.region + e.postseason.state)} sub={`${n(e.postseason.district)} districts · ${n(e.postseason.region)} regions · ${n(e.postseason.state)} state`} />}
      </div>
      <Card title="How matches ended" badge={e?.jamborees ? 'dual matches include jamboree pairings' : undefined}>
        <Rows headers={['Result', 'All', '%', 'Dual', '%', 'Tournament', '%', 'Postseason', '%']} rows={[
          ...RESULT_ORDER.map(c => [
            c, n(t.by_result[c]), pctOf(t.by_result[c] ?? 0, t.matches),
            ...(['duals', 'tournaments', 'postseason'] as const).flatMap(k => [n(t.by_source[k][c]), pctOf(t.by_source[k][c] ?? 0, srcTotal(k))]),
          ]),
          [<b key="t">Total</b>, <b key="a">{n(t.matches)}</b>, '',
            ...(['duals', 'tournaments', 'postseason'] as const).flatMap(k => [<b key={k}>{n(srcTotal(k))}</b>, ''])],
        ]} />
        <p className="text-xs text-slate-400 px-3 pt-2">Not counted: {n(t.not_counted)} double forfeits, no contests, byes and unknown results.</p>
      </Card>

      <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3">NJSIAA vs non-NJSIAA</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Matches" value={n(v.matches)} sub={`against ${n(v.opponents)} schools`} />
        <Stat label="NJ record" value={`${n(v.wins)}–${n(v.losses)}`} sub={pctOf(v.wins, v.matches)} />
      </div>
      <Card title="How they ended" badge="out-of-state schools and NJ non-members; duals and in-season tournaments">
        <Rows headers={['Result', 'NJ won', 'NJ lost']} rows={RESULT_ORDER.map(c => [c, n(v.won[c]), n(v.lost[c])])} />
      </Card>

      <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3">Postseason</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="District entrants" value={n(p.district_entrants)} sub={`${n(p.district_schools)} schools`} />
        <Stat label="Reached regions" value={n(p.region_qualifiers)} sub={`${n(p.district_champions)} district champions`} />
        <Stat label="Reached states" value={n(p.state_qualifiers)} sub={`${n(p.region_champions)} region champions`} />
        <Stat label="State podium" value={n(p.state_placers)} sub={`${p.state_champions.length} state champions`} />
      </div>
      <Card title="State Champions">
        <Rows headers={['Wt', 'Champion', 'School']} rows={p.state_champions.map(c => [c.weight, c.wrestler_name, c.school_name])} />
      </Card>

      <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3">Season Bests</h2>
      <p className="text-xs text-slate-500 mb-3">From the daily Snap Shots (state view); the date is the day it happened.</p>
      <div className="grid md:grid-cols-2 gap-x-4">
        <Card title="Fastest Pins" badge="Top 10">
          <Rows headers={['Time', 'Wrestler', 'School', 'Opponent', 'Wt', 'Date']} rows={b.fastest_pins.map(x => [fmtTime(x.fall_time_sec), x.wrestler_name, x.school_name, x.opponent_name, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Fastest Tech Falls" badge="Top 10">
          <Rows headers={['Time', 'Wrestler', 'School', 'Opponent', 'Wt', 'Date']} rows={b.fastest_techs.map(x => [fmtTime(x.fall_time_sec), x.wrestler_name, x.school_name, x.opponent_name, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Fastest Duals" badge="Top 10 by total mat time">
          <Rows headers={['Mat time', 'Dual', 'Bouts', 'Date']} rows={b.fastest_duals.map(x => [fmtTime(x.total_seconds), `${x.school1} v ${x.school2}`, x.bout_count, fmtDate(x.date)])} />
        </Card>
        <Card title="Longest Streaks" badge="Top 10 each">
          {(['win', 'pin', 'tech', 'bonus'] as const).map(k => (
            <div key={k} className="mb-2">
              <p className="text-xs font-semibold text-slate-500 px-3 pt-1 uppercase">{k === 'bonus' ? 'Bonus wins' : `${k[0].toUpperCase()}${k.slice(1)}s`}</p>
              <Rows headers={['Streak', 'Wrestler', 'School']} rows={b.streaks[k].slice(0, 5).map(x => [x.streak_len, x.wrestler_name, x.school_name])} />
            </div>
          ))}
        </Card>
        {b.active_streaks && (
          <Card title="Streaks Carried Into Next Season" badge="Still running at season end · seniors left out">
            {(['win', 'pin', 'tech', 'bonus'] as const).map(k => (
              <div key={k} className="mb-2">
                <p className="text-xs font-semibold text-slate-500 px-3 pt-1 uppercase">{k === 'bonus' ? 'Bonus wins' : `${k[0].toUpperCase()}${k.slice(1)}s`}</p>
                <Rows headers={['Streak', 'Wrestler', 'School', 'Since', 'Class']} rows={b.active_streaks![k].map(x => [x.streak_len, x.wrestler_name, x.school_name, x.started_on ? fmtDate(x.started_on) : '—', x.class_year ?? '—'])} />
              </div>
            ))}
          </Card>
        )}
        {b.toughest_schedules && (
          <Card title="Toughest Schedules" badge={`Top 10 by average opponent ${RATING_SHORT} · ${TOUGH_MIN_MATCHES}+ rated bouts`}>
            <Rows headers={[`Avg opp ${RATING_SHORT}`, 'Wrestler', 'School', 'Bouts', 'W-L']} rows={b.toughest_schedules.map(x => [x.avg_opp.toFixed(2), x.wrestler_name, x.school_name, x.matches, `${x.wins}-${x.losses}`])} />
          </Card>
        )}
        <Card title="Highest-Rated Matches" badge="Top 10">
          <Rows headers={[`Combined ${RATING_SHORT}`, 'Winner', 'Loser', 'Result', 'Wt', 'Date']} rows={b.top_rated_matches.map(x => [x.combined.toFixed(1), `${x.winner_name} (${x.winner_school})`, `${x.loser_name} (${x.loser_school})`, x.result_type, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Biggest Upsets" badge={`Top 10 by ${RATING_SHORT} gap · rated winners`}>
          <Rows headers={['Gap', 'Winner', RATING_SHORT, 'Loser', RATING_SHORT, 'Result', 'Wt', 'Date']} rows={b.upsets_by_gap.map(x => [x.gap.toFixed(1), `${x.winner_name} (${x.winner_school})`, x.winner_hammer.toFixed(1), `${x.loser_name} (${x.loser_school})`, x.loser_hammer.toFixed(1), x.result_type, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Biggest Upsets by Unrated Winners" badge={`winner's ${RATING_SHORT} was 0`}>
          <Rows headers={['Gap', 'Winner', RATING_SHORT, 'Loser', RATING_SHORT, 'Result', 'Wt', 'Date']} rows={(b.upsets_by_gap_unrated ?? []).map(x => [x.gap.toFixed(1), `${x.winner_name} (${x.winner_school})`, x.winner_hammer.toFixed(1), `${x.loser_name} (${x.loser_school})`, x.loser_hammer.toFixed(1), x.result_type, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Highest-Rated Upsets" badge="Top 10">
          <Rows headers={[`Combined ${RATING_SHORT}`, 'Winner', RATING_SHORT, 'Loser', RATING_SHORT, 'Result', 'Date']} rows={b.top_rated_upsets.map(x => [x.combined.toFixed(1), `${x.winner_name} (${x.winner_school})`, x.winner_hammer.toFixed(1), `${x.loser_name} (${x.loser_school})`, x.loser_hammer.toFixed(1), x.result_type, fmtDate(x.date)])} />
        </Card>
        <Card title="Team Upsets" badge="higher-ranked team lost">
          <Rows headers={['Winner', 'Loser', 'Score', 'Rank gap', 'Date']} rows={b.team_upsets.map(x => [`${x.winner_school_name}${x.winner_rank ? ` (#${x.winner_rank})` : ''}`, `${x.loser_school_name}${x.loser_rank ? ` (#${x.loser_rank})` : ''}`, x.score, x.rank_gap ?? '—', fmtDate(x.date)])} />
        </Card>
        <Card title="Most Points — Single Team" badge="Top 5">
          <Rows headers={['Points', 'School', 'Opponent', 'Score', 'Date']} rows={b.most_points_single.map(x => [x.score, x.school_name, x.opponent, x.meet_score, fmtDate(x.date)])} />
        </Card>
        <Card title="Most Points — Combined" badge="Top 5">
          <Rows headers={['Points', 'Dual', 'Score', 'Date']} rows={b.most_points_combined.map(x => [x.score, `${x.school_name} v ${x.opponent}`, x.meet_score, fmtDate(x.date)])} />
        </Card>
        <Card title="Largest Margins of Victory" badge="Top 5">
          <Rows headers={['Margin', 'Winner', 'Loser', 'Score', 'Date']} rows={b.largest_margins.map(x => [x.margin, x.winner_school, x.loser_school, x.score, fmtDate(x.date)])} />
        </Card>
        <Card title="Final Bout Victories" badge={`${n(b.final_bout_wins)} duals won in the last bout (≤6 pts)`}>
          <Rows headers={['Winner', 'Loser', 'Score', 'Last bout', 'Date']} rows={b.closest_final_bout_wins.map(x => [x.winning_school, x.losing_school, x.score, `${x.last_weight_class} ${x.last_winner_name} (${x.last_result_type})`, fmtDate(x.date)])} />
        </Card>
        <Card title="Team Single-Match Bests" badge="Top 10 each">
          {([['pins', 'Most pins in a match'], ['techs', 'Most tech falls in a match'], ['combined', 'Most stoppages (pins + techs)'], ['bonus_pct', 'Highest bonus-win %']] as const).map(([k, label]) => (
            <div key={k} className="mb-2">
              <p className="text-xs font-semibold text-slate-500 px-3 pt-1 uppercase">{label}</p>
              <Rows headers={['', 'School', 'Date']} rows={b.team_highs[k].slice(0, 5).map(x => [k === 'bonus_pct' ? `${Math.round(x.best_value * 100)}%` : x.best_value, x.school_name, fmtDate(x.best_on)])} />
            </div>
          ))}
        </Card>
        <Card title="First Career Wins">
          <div className="grid grid-cols-2 gap-3 p-2">
            <Stat label="First career wins" value={n(b.first_career_wins)} />
            <Stat label="Won their first-ever match" value={n(b.first_career_matches)} />
          </div>
        </Card>
        <Card title="Tournament Champions" badge={`Top 10 by opponents' combined ${RATING_SHORT}`}>
          <Rows headers={['Champion', 'School', 'Tournament', 'Wt', 'Date']} rows={b.tournament_champs.map(x => [x.wrestler_name, x.school_name, x.tournament_name, x.weight_class, fmtDate(x.date)])} />
        </Card>
        <Card title="Tournament Upsets" badge={`Top 10 by ${RATING_SHORT} gap · rated winners`}>
          <Rows headers={['Gap', 'Winner', RATING_SHORT, 'Loser', RATING_SHORT, 'Tournament', 'Wt']} rows={b.tournament_upsets.map(x => [x.gap.toFixed(1), `${x.winner_name} (${x.winner_school})`, x.winner_hammer.toFixed(1), `${x.loser_name} (${x.loser_school})`, x.loser_hammer.toFixed(1), x.tournament_name, x.weight_class])} />
        </Card>
        <Card title="Tournament Upsets by Unrated Winners" badge={`winner's ${RATING_SHORT} was 0`}>
          <Rows headers={['Gap', 'Winner', RATING_SHORT, 'Loser', RATING_SHORT, 'Tournament', 'Wt']} rows={(b.tournament_upsets_unrated ?? []).map(x => [x.gap.toFixed(1), `${x.winner_name} (${x.winner_school})`, x.winner_hammer.toFixed(1), `${x.loser_name} (${x.loser_school})`, x.loser_hammer.toFixed(1), x.tournament_name, x.weight_class])} />
        </Card>
        <Card title="Lowest Seeds to Win" badge="champions">
          <Rows headers={['Seed', 'Champion', 'School', 'Tournament', 'Wt']} rows={b.lowest_seed_wins.map(x => [x.seed, x.wrestler_name, x.school_name, x.tournament_name, x.weight_class])} />
        </Card>
        <Card title="Most Mat Time by Tournament" badge="Top 10">
          <Rows headers={['Mat time', 'Tournament', 'Bouts', 'Avg']} rows={b.tournament_mat_times.map(x => [fmtTime(x.total_seconds), x.tournament_name, x.bout_count, fmtTime(x.avg_seconds)])} />
        </Card>
      </div>
      <Card title="Final Top 25" badge={b.final_top25_date ? `as of ${fmtDate(b.final_top25_date)}` : undefined}>
        <Rows headers={['#', 'School', 'Score']} rows={b.final_top25.map(x => [x.rank, x.school_name, x.score.toFixed(2)])} />
      </Card>
    </div>
  )
}

export function EndOfSeasonPanel({ seasons, gender }: { seasons: Season[]; gender: 'M' | 'F' }) {
  const [seasonId, setSeasonId] = useState<number>(seasons[0]?.id ?? 0)
  const [report, setReport] = useState<SeasonReport | null>(null)
  const [computedAt, setComputedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const label = seasons.find(s => s.id === seasonId)?.label ?? ''

  async function load() {
    setLoading(true); setError(null)
    const res = await fetch(`/api/admin/snapshot-season?gender=${gender}&season=${encodeURIComponent(label)}`)
    const json = await res.json()
    if (res.ok) { setReport(json.payload); setComputedAt(json.computed_at) }
    else { setReport(null); setComputedAt(null); setError(res.status === 404 ? 'Not saved yet for this season: click Compute & Save.' : json.error ?? 'Load failed') }
    setLoading(false)
  }
  async function compute() {
    setLoading(true); setError(null)
    const res = await fetch('/api/admin/snapshot-season', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, seasonId }) })
    const json = await res.json()
    if (res.ok) { setReport(json.payload); setComputedAt(json.computed_at) } else setError(json.error ?? 'Compute failed')
    setLoading(false)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Season</label>
          <select value={seasonId} onChange={e => { setSeasonId(Number(e.target.value)); setReport(null); setComputedAt(null) }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} className="px-4 py-1.5 text-sm font-medium bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 transition-colors">Load</button>
        <button onClick={compute} disabled={loading} className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 transition-colors">
          {loading ? 'Working…' : 'Compute & Save'}
        </button>
        {computedAt && <p className="text-xs text-slate-400">Computed {new Date(computedAt).toLocaleString()}</p>}
      </div>
      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}
      {!report && !loading && !error && (
        <div className="text-slate-400 text-sm py-8 text-center">Pick a season and click <strong>Load</strong> for the saved end-of-season report, or <strong>Compute &amp; Save</strong> to build it (about 20 seconds).</div>
      )}
      {report && <Report r={report} />}
    </div>
  )
}
