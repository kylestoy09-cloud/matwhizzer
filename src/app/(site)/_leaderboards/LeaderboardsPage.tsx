// The leaderboards page, rendered by /boys/leaderboards and /girls/leaderboards with their own
// gender. One table per view: Regular Season | Postseason | Advanced Analytics, then the
// level (postseason), Team | Individual, the category and the weight. Each view reads only its
// own rows (src/lib/leaderboards/data.ts).

import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { getActiveSeason } from '@/lib/get-season'
import { getRatingBlurb } from '@/lib/rating-server'
import { RATING_NAME, RATING_SHORT } from '@/lib/rating'
import {
  ANALYTICS, LEVELS, MIN_DUALS, MIN_PS_MATCHES, MIN_PS_TEAM_MATCHES, MIN_RS_MATCHES, MIN_RS_TEAM_CONTESTED,
  PAGE, PS_INDIVIDUAL, PS_TEAM, RS_INDIVIDUAL, RS_TEAM, WEIGHTS, hrefFor, readParams, rowCap,
  type Gender, type Params,
} from '@/lib/leaderboards/config'
import {
  analytics, psIndividual, psTeam, rsIndividual, rsTeam, schoolsById,
  type AnalyticsRow, type School, type TeamRow, type WrestlerRow,
} from '@/lib/leaderboards/data'
import { LbTable, SchoolCell, TabRow, WrestlerCell, fmtTime, num, type Col } from '@/components/leaderboards/LbParts'
import { LbFilters } from '@/components/leaderboards/LbFilters'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

type SP = Promise<Record<string, string | string[] | undefined>>

const ROUND: Record<string, string> = { F: 'Final', SF: 'SF', QF: 'QF', R1: 'R1', R2: 'R2', '3rd_Place': '3rd', '5th_Place': '5th', '7th_Place': '7th' }
const pct = (v: number | null | undefined) => (v == null ? '—' : `${Number(v).toFixed(1)}%`)
const b = (v: React.ReactNode) => <span className="font-bold text-slate-800 tabular-nums">{v}</span>
const dim = (v: React.ReactNode) => <span className="text-slate-500 tabular-nums">{v}</span>

export async function LeaderboardsPage({ gender, searchParams }: { gender: Gender; searchParams: SP }) {
  const p = readParams(await searchParams, gender)
  const season = await getActiveSeason(gender)
  const base = gender === 'M' ? '/boys' : '/girls'
  const path = `${base}/leaderboards`
  const L = (patch: Parameters<typeof hrefFor>[2]) => hrefFor(path, p, patch)
  const fresh = { sort: null, n: null }                     // switching tables starts at the top 25

  // Advanced Analytics is postseason analytics: a tab under Postseason, not beside it
  const phaseTabs = [
    { key: 'regular',    label: 'Regular Season', href: L({ tab: 'regular', cat: null, wt: null, ...fresh }) },
    { key: 'postseason', label: 'Postseason',     href: L({ tab: 'postseason', cat: null, wt: null, conf: null, sec: null, grp: null, ...fresh }) },
  ]
  const postseasonTabs = [
    { key: 'postseason', label: 'Leaderboards',       href: L({ tab: 'postseason', cat: null, wt: null, ...fresh }) },
    { key: 'analytics',  label: 'Advanced Analytics', href: L({ tab: 'analytics', cat: null, wt: null, ...fresh }) },
  ]
  const subtitle = p.tab === 'regular' ? 'regular season — duals & in-season tournaments' : 'postseason — districts, regions & state'

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6 text-center">
        <PageHeader title="NJSIAA Leaderboard" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>NJSIAA</span>
          <InlineSeasonPicker gender={gender} activeSeason={season} />
          <span>{gender === 'M' ? 'boys' : 'girls'} {subtitle}</span>
        </div>
      </div>

      <div className="space-y-4">
        <TabRow items={phaseTabs} active={p.tab === 'regular' ? 'regular' : 'postseason'} />
        {p.tab !== 'regular' && <TabRow items={postseasonTabs} active={p.tab} level={2} />}
        {p.tab === 'analytics'
          ? await AnalyticsView({ gender, season, p, base, L })
          : await TableView({ gender, season, p, base, L, path })}
      </div>
    </div>
  )
}

type ViewArgs = { gender: Gender; season: number; p: Params; base: string; L: (patch: Parameters<typeof hrefFor>[2]) => string }

async function TableView({ gender, season, p, base, L, path }: ViewArgs & { path: string }) {
  const rs = p.tab === 'regular'
  const cats = rs ? (p.side === 'team' ? RS_TEAM : RS_INDIVIDUAL) : (p.side === 'team' ? PS_TEAM : PS_INDIVIDUAL)
  const cat = cats.find(c => c.key === p.cat) ?? cats[0]
  const fresh = { sort: null, n: null }

  const sideTabs = (['team', 'individual'] as const).map(s => ({ key: s, label: s === 'team' ? 'Team' : 'Individual', href: L({ side: s, cat: null, wt: null, ...fresh }) }))
  const catTabs = cats.map(c => ({ key: c.key, label: c.label, href: L({ cat: c.key, ...fresh }) }))
  const wtTabs = [{ key: 'all', label: 'All Weights', href: L({ wt: null, n: null }) },
    ...WEIGHTS[gender].map(w => ({ key: String(w), label: String(w), href: L({ wt: w, n: null }) }))]

  const levelTabs = LEVELS.map(l => ({ key: l.key, label: l.label, href: L({ level: l.key, ...fresh }) }))
  const scopeTabs = [
    { key: 'at',   label: `At ${p.level === 'state' ? 'State' : 'Regions'}`,      href: L({ scope: 'at', n: null }) },
    { key: 'thru', label: `Through ${p.level === 'state' ? 'State' : 'Regions'}`, href: L({ scope: 'thru', n: null }) },
  ]

  return (
    <>
      {!rs && <TabRow items={levelTabs} active={p.level} level={2} />}
      {!rs && p.level !== 'district' && <TabRow items={scopeTabs} active={p.scope} level={3} />}
      {rs && <LbFilters hrefBase={L({ conf: null, sec: null, grp: null, n: null })} conf={p.conf} sec={p.sec} grp={p.grp} />}
      <TabRow items={sideTabs} active={p.side} level={2} />
      <TabRow items={catTabs} active={cat.key} level={2} />
      {cat.weights && <TabRow items={wtTabs} active={p.wt ? String(p.wt) : 'all'} level={3} />}
      <div className="pt-2">
        {p.side === 'individual'
          ? await IndividualTable({ gender, season, p, base, L, rs })
          : await TeamTable({ gender, season, p, base, L, rs })}
      </div>
      <p className="text-[11px] text-slate-400"><Link href={path} className="underline">Reset view</Link></p>
    </>
  )
}

function more(p: Params, has: boolean, L: ViewArgs['L']) {
  return has && p.n + PAGE <= rowCap(p) ? L({ n: p.n + PAGE }) : null
}

async function IndividualTable({ gender, season, p, base, L, rs }: ViewArgs & { rs: boolean }) {
  const { rows, more: has, error } = rs ? await rsIndividual(gender, season, p) : await psIndividual(gender, season, p)
  const who: Col<WrestlerRow> = { label: 'Wrestler', render: r => <WrestlerCell base={base} id={r.wrestler_id} name={r.wrestler_name} school={r.school} /> }
  const wt: Col<WrestlerRow> = { label: 'Wt', align: 'right', render: r => dim(r.weight ?? '—') }
  const sortCol = (key: string, label: string, render: Col<WrestlerRow>['render']): Col<WrestlerRow> =>
    ({ label, align: 'right', render, sort: { key, href: L({ sort: key, n: null }) } })
  const where = rs ? 'this regular season' : 'in this round'
  let title = '', description = '', cols: Col<WrestlerRow>[] = [], active: string | undefined
  switch (p.cat) {
    case 'quickest': {
      active = p.sort === 'tech' ? 'tech' : 'deck'
      title = active === 'tech' ? 'Quickest Tech' : 'Quickest Deck'
      description = `Each wrestler's fastest fall and fastest tech fall ${where}. Click a column to sort by it.`
      cols = [who,
        { label: 'Wt', align: 'right', render: r => dim((rs ? (active === 'tech' ? r.fastest_tf_wt : r.fastest_pin_wt) : r.weight) ?? '—') },
        ...(rs ? [] : [{ label: 'Match', align: 'right' as const, render: (r: WrestlerRow) => <span className="text-slate-400 text-xs">{active === 'tech' ? r.fastest_tf_ctx : r.fastest_pin_ctx}</span> }]),
        sortCol('deck', 'Deck', r => <span className={`tabular-nums font-mono ${active === 'deck' ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{fmtTime(r.fastest_pin)}</span>),
        sortCol('tech', 'Tech', r => <span className={`tabular-nums font-mono ${active === 'tech' ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{fmtTime(r.fastest_tf)}</span>),
      ]
      break
    }
    case 'most':
      active = p.sort === 'pins' || p.sort === 'techs' ? p.sort : 'combo'
      title = active === 'pins' ? 'Most Pins' : active === 'techs' ? 'Most Techs' : 'Most Pins + Techs'
      description = `Falls and tech falls ${where}, with each one's average time — a tie on the count goes to the faster average. Click a column to sort by it.`
      {
        const avg = (key: string, v: number | null) => <span className={`tabular-nums font-mono text-xs ${active === key ? 'text-slate-700' : 'text-slate-400'}`}>{fmtTime(v)}</span>
        cols = [who, wt,
          sortCol('pins', 'Pins', r => (active === 'pins' ? b(r.pins) : dim(r.pins))),
          { label: 'Avg Pin', align: 'right', render: r => avg('pins', r.pin_avg) },
          sortCol('techs', 'Techs', r => (active === 'techs' ? b(r.techs) : dim(r.techs))),
          { label: 'Avg Tech', align: 'right', render: r => avg('techs', r.tf_avg) },
          sortCol('combo', 'Pins + Techs', r => (active === 'combo' ? b(r.pins_techs) : dim(r.pins_techs))),
          { label: 'Avg', align: 'right', render: r => avg('combo', r.pt_avg) },
        ]
      }
      break
    case 'bonus':
      title = 'Bonus Point %'
      description = `Falls + tech falls + major decisions ÷ matches wrestled (forfeit wins aren't matches) — min ${rs ? MIN_RS_MATCHES : MIN_PS_MATCHES} matches`
      cols = [who, wt, { label: 'Bonus', align: 'right', render: r => dim(r.bonus_wins) }, { label: 'Matches', align: 'right', render: r => dim(r.matches) },
        { label: 'Pct', align: 'right', render: r => b(pct(r.bonus_pct)) }]
      break
    case 'wrr':
      title = RATING_NAME
      description = await getRatingBlurb()
      cols = [who, wt, { label: RATING_SHORT, align: 'right', render: r => b(num(r.wrr, 1)) }]
      break
    case 'points':
      title = 'Wrestler Points'
      description = 'NJSIAA team-scoring points earned — advancement + win bonus (fall, tech, major) + placement'
      cols = [who, wt, { label: 'Wins', align: 'right', render: r => dim(r.wins) }, { label: 'Points', align: 'right', render: r => b(num(r.points, 1)) }]
      break
    case 'mattime':
      title = 'Mat Time'
      description = 'Least total time on the mat among unbeaten wrestlers with 3+ wins (a decision counts as 6:00)'
      cols = [who, wt, { label: 'Wins', align: 'right', render: r => dim(r.mat_wins) }, { label: 'Total Time', align: 'right', render: r => b(fmtTime(r.mat_time)) }]
      break
  }
  return <LbTable title={title} description={description} rows={rows} cols={cols} activeSort={active} moreHref={more(p, has, L)} error={error} />
}

async function TeamTable({ gender, season, p, base, L, rs }: ViewArgs & { rs: boolean }) {
  const { rows, more: has, error } = rs ? await rsTeam(gender, season, p) : await psTeam(gender, season, p)
  const school: Col<TeamRow> = { label: 'School', render: r => <SchoolCell base={base} school={r.school} /> }
  const sortCol = (key: string, label: string, render: Col<TeamRow>['render']): Col<TeamRow> =>
    ({ label, align: 'right', render, sort: { key, href: L({ sort: key, n: null }) } })
  let title = '', description = '', cols: Col<TeamRow>[] = [], active: string | undefined
  switch (p.cat) {
    case 'pins': case 'techs': {
      const pins = p.cat === 'pins'
      title = pins ? 'Most Pins' : 'Most Techs'
      if (rs) {
        active = ['dual', 'tourn', 'pct'].includes(p.sort ?? '') ? p.sort! : 'total'
        description = `Team total ${pins ? 'falls' : 'tech falls'} in duals and in-season tournaments — min ${MIN_RS_TEAM_CONTESTED} contested matches. Click a column to sort by it.`
        cols = [school,
          sortCol('dual', 'Dual', r => dim(pins ? r.dual_pins : r.dual_techs)),
          sortCol('tourn', 'Tourn', r => dim(pins ? r.tourn_pins : r.tourn_techs)),
          sortCol('total', 'Total', r => b(pins ? r.pins : r.techs)),
          sortCol('pct', pins ? 'Pin %' : 'TF %', r => dim(pct(pins ? r.pin_pct : r.tf_pct))),
        ]
      } else {
        description = `Team total ${pins ? 'falls' : 'tech falls'} in this round`
        cols = [school, { label: 'Matches', align: 'right', render: r => dim(r.matches) }, { label: pins ? 'Pins' : 'Techs', align: 'right', render: r => b(pins ? r.pins : r.techs) }]
      }
      break
    }
    case 'bonus':
      title = 'Bonus Point %'
      description = `Team falls + tech falls + majors ÷ matches wrestled — min ${rs ? `${MIN_RS_TEAM_CONTESTED} contested` : MIN_PS_TEAM_MATCHES} matches`
      cols = [school, { label: 'Bonus', align: 'right', render: r => dim(r.bonus_wins) }, { label: 'Matches', align: 'right', render: r => dim(r.matches) },
        { label: 'Bonus %', align: 'right', render: r => b(pct(r.bonus_pct)) }]
      break
    case 'wrr':
      title = `Team ${RATING_NAME}`
      description = `Best ${RATING_SHORT} at each weight class, summed across all ${WEIGHTS[gender].length} weights ÷ ${WEIGHTS[gender].length}`
      cols = [school, { label: RATING_SHORT, align: 'right', render: r => b(num(r.team_wrr, 2)) }]
      break
    case 'ppd':
      title = 'Points Per Dual'
      description = `Average team score per dual meet, from the points recorded on each bout — min ${MIN_DUALS} duals`
      cols = [school, { label: 'Duals', align: 'right', render: r => dim(r.duals) }, { label: 'Total Pts', align: 'right', render: r => dim(r.dual_points) },
        { label: 'Pts/Dual', align: 'right', render: r => b(num(r.points_per_dual, 1)) }]
      break
    case 'points':
      title = 'Team Points'
      description = 'NJSIAA team scoring for this round'
      cols = [school, { label: 'Points', align: 'right', render: r => b(num(r.team_points, 1)) }]
      break
  }
  return <LbTable title={title} description={description} rows={rows} cols={cols} activeSort={active} moreHref={more(p, has, L)} error={error} />
}

// ── Advanced analytics ───────────────────────────────────────────────────────────────

async function AnalyticsView({ gender, season, p, base, L }: ViewArgs) {
  const cat = ANALYTICS.find(c => c.key === p.cat) ?? ANALYTICS[0]
  const fresh = { sort: null, n: null }
  const catTabs = ANALYTICS.map(c => ({ key: c.key, label: c.label, href: L({ cat: c.key, ...fresh }) }))
  const levelTabs = [{ key: 'all', label: 'All Rounds', href: L({ alevel: null, n: null }) },
    ...LEVELS.map(l => ({ key: l.key, label: l.label, href: L({ alevel: l.key, n: null }) }))]
  const [{ rows, more: has, error }, schools] = await Promise.all([analytics(gender, season, p), schoolsById()])
  const sch = (id: unknown): School | null => (typeof id === 'number' ? schools.get(id) ?? null : null)
  const person = (id: unknown, name: unknown, schoolId: unknown) =>
    <WrestlerCell base={base} id={String(id)} name={String(name ?? '')} school={sch(schoolId)} />
  const loser = (id: unknown, name: unknown, schoolId: unknown, extra?: string) => {
    const s = sch(schoolId)
    return (
      <span className="flex items-center gap-1.5 min-w-0">
        <SchoolLogoBadge logoUrl={s?.logo_url} bgColor={s?.header_background} placeholder />
        <Link href={`${base}/wrestler/${id}`} className="text-slate-500 text-xs hover:underline truncate">{String(name ?? '')}{extra ? ` ${extra}` : ''}</Link>
      </span>
    )
  }
  const v = (r: AnalyticsRow, k: string) => r[k]
  const title = cat.label
  let description = '', cols: Col<AnalyticsRow>[] = []
  switch (cat.key) {
    case 'buster':
      description = 'Biggest upsets by seed — a lower seed beating a higher seed in the championship bracket'
      cols = [
        { label: 'Winner', render: r => person(v(r, 'winner_id'), v(r, 'winner_name'), v(r, 'winner_school_id')) },
        { label: 'Seed', align: 'right', render: r => dim(`#${v(r, 'winner_seed')}`) },
        { label: 'Over', render: r => loser(v(r, 'loser_id'), v(r, 'loser_name'), v(r, 'loser_school_id'), `(#${v(r, 'loser_seed')})`) },
        { label: 'Gap', align: 'right', render: r => b(`+${v(r, 'seed_gap')}`) },
        { label: 'Result', align: 'right', render: r => <span className="text-slate-400 text-xs">{String(v(r, 'win_type') ?? '')} · {ROUND[String(v(r, 'round'))] ?? String(v(r, 'round'))}</span> },
        { label: 'Wt', align: 'right', render: r => dim(v(r, 'weight')) },
      ]
      break
    case 'backside':
      description = 'Most consolation-bracket wins'
      cols = [
        { label: 'Wrestler', render: r => person(v(r, 'wrestler_id'), v(r, 'wrestler_name'), v(r, 'school_id')) },
        { label: 'Cons. Wins', align: 'right', render: r => b(v(r, 'consol_wins')) },
        { label: 'Tournament', render: r => <span className="text-slate-500 text-xs">{String(v(r, 'tournament_name') ?? '').replace(/^(Boy|Girl)_s /, '')}</span> },
        { label: 'Wt', align: 'right', render: r => dim(v(r, 'weight')) },
      ]
      break
    case 'techmasters':
      description = 'Every contested win a tech fall (2+ wins)'
      cols = [
        { label: 'Wrestler', render: r => person(v(r, 'wrestler_id'), v(r, 'wrestler_name'), v(r, 'school_id')) },
        { label: 'Wt', align: 'right', render: r => dim(v(r, 'weight')) },
        { label: 'TFs', align: 'right', render: r => b(v(r, 'tech_fall_wins')) },
        { label: 'Avg', align: 'right', render: r => dim(fmtTime(v(r, 'avg_tf_seconds') as number | null)) },
        { label: 'Fastest', align: 'right', render: r => dim(fmtTime(v(r, 'fastest_tf_seconds') as number | null)) },
      ]
      break
    case 'cinderella':
      description = 'Lowest-seeded region champions — seed 3 or worse'
      cols = [
        { label: 'Champion', render: r => person(v(r, 'wrestler_id'), v(r, 'wrestler_name'), v(r, 'school_id')) },
        { label: 'Wt', align: 'right', render: r => dim(v(r, 'weight')) },
        { label: 'Seed', align: 'right', render: r => b(`#${v(r, 'seed')}`) },
        { label: 'Region', align: 'right', render: r => <span className="text-slate-500 text-xs">{String(v(r, 'region') ?? '')}</span> },
      ]
      break
    case 'revenge':
      description = 'Avenged a district loss at regions — same opponent, different result'
      cols = [
        { label: 'Avenger', render: r => person(v(r, 'avenger_id'), v(r, 'avenger_name'), v(r, 'avenger_school_id')) },
        { label: 'Over', render: r => loser(v(r, 'opponent_id'), v(r, 'opponent_name'), v(r, 'opponent_school_id')) },
        { label: 'Wt', align: 'right', render: r => dim(v(r, 'weight')) },
        { label: 'Round', align: 'right', render: r => <span className="text-slate-400 text-xs">{String(v(r, 'region') ?? '')} {ROUND[String(v(r, 'revenge_round'))] ?? String(v(r, 'revenge_round'))}</span> },
      ]
      break
    case 'margins':
      description = 'Average score margin in decisions and major decisions — lower = tighter competition'
      cols = [
        { label: 'Weight', render: r => <span className="font-medium text-slate-800 tabular-nums">{String(v(r, 'weight'))} lb</span> },
        { label: 'Avg Margin', align: 'right', render: r => { const m = Number(v(r, 'avg_margin')); return <span className={`font-bold tabular-nums ${m <= 3 ? 'text-emerald-600' : m <= 6 ? 'text-amber-600' : 'text-slate-700'}`}>+{m.toFixed(2)}</span> } },
        { label: 'Matches', align: 'right', render: r => dim(v(r, 'match_count')) },
      ]
      break
    case 'districts':
      description = 'Districts ranked by wrestlers advancing to regions; state qualifiers alongside'
      cols = [
        { label: 'District', render: r => <span className="font-medium text-slate-800">{String(v(r, 'district_name'))}</span> },
        { label: 'Advancing', align: 'right', render: r => b(v(r, 'wrestlers_advancing')) },
        { label: 'State Qualifiers', align: 'right', render: r => dim(v(r, 'state_qualifiers')) },
      ]
      break
    case 'depth':
      description = 'Schools with the most wrestlers reaching the season\'s furthest round (state, once it is wrestled)'
      cols = [
        { label: 'School', render: r => <SchoolCell base={base} school={sch(v(r, 'school_id'))} /> },
        { label: 'Wrestlers', align: 'right', render: r => b(v(r, 'wrestlers')) },
        { label: 'Weights', align: 'right', render: r => dim(v(r, 'weight_classes_placed')) },
      ]
      break
  }
  return (
    <>
      <TabRow items={catTabs} active={cat.key} level={2} />
      {cat.levels && <TabRow items={levelTabs} active={p.alevel ?? 'all'} level={3} />}
      <div className="pt-2">
        <LbTable title={title} description={description} rows={rows} cols={cols} moreHref={more(p, has, L)} error={error} />
      </div>
    </>
  )
}
