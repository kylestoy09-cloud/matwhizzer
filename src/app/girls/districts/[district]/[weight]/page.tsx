import { supabase } from '@/lib/supabase'
import { getActiveSeason } from '@/lib/get-season'
import { SEASONS } from '@/lib/seasons'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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
  winner_seed: number | null
  winner_grade: string | null
  loser_entry_id: string | null
  loser_wrestler_id: string | null
  loser_name: string | null
  loser_school: string | null
  loser_school_name: string | null
  loser_seed: number | null
  loser_grade: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_H = 88

const ROUND_LABEL: Record<string, string> = {
  R2: 'Prelims',
  QF: 'Quarters',
  SF: 'Semis',
  F: 'Finals',
  '3rd_Place': '3rd Place',
  '5th_Place': '5th Place',
  '7th_Place': '7th Place',
}

const CHAMP_COLS = ['QF', 'SF', 'F'] as const
const PREV_ROUND: Record<string, string> = { SF: 'QF', F: 'SF', QF: 'R2' }

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatResult(m: MatchRow): string {
  if (!m.win_type) return ''
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

// ── Match Card ─────────────────────────────────────────────────────────────────

function WrestlerRow({
  wrestlerId,
  name,
  school,
  seed,
  grade,
  isWinner,
}: {
  wrestlerId: string | null
  name: string | null
  school: string | null
  seed: number | null
  grade: string | null
  isWinner: boolean
  isBye: boolean
}) {
  const inner = wrestlerId ? (
    <Link
      href={`/wrestler/${wrestlerId}`}
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
      <span className="text-[10px] text-slate-400 shrink-0 max-w-[52px] truncate">
        {school ?? ''}
        {grade ? <span className="ml-1 text-slate-300">{grade}</span> : null}
      </span>
    </div>
  )
}

function MatchCard({ m }: { m: MatchRow }) {
  const isBye = !m.loser_wrestler_id
  const result = formatResult(m)

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm w-56 shrink-0"
      style={{ height: CARD_H }}
    >
      <WrestlerRow
        wrestlerId={m.winner_wrestler_id}
        name={m.winner_name}
        school={m.winner_school}
        seed={m.winner_seed}
        grade={m.winner_grade}
        isWinner
        isBye={false}
      />
      <div className="border-t border-slate-100" />
      <WrestlerRow
        wrestlerId={m.loser_wrestler_id}
        name={m.loser_name}
        school={m.loser_school}
        seed={m.loser_seed}
        grade={m.loser_grade}
        isWinner={false}
        isBye={isBye}
      />
      <div
        className="flex items-center justify-end px-2.5 border-t border-slate-100"
        style={{ height: CARD_H - 36 - 36 - 1 - 1 }}
      >
        <span className="text-[10px] text-slate-400 tabular-nums">{result}</span>
      </div>
    </div>
  )
}

function MobileRound({ label, matches }: { label: string; matches: MatchRow[] }) {
  return (
    <section>
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</h3>
      <div className="space-y-2">
        {matches.map(m => (
          <MatchCard key={m.match_id} m={m} />
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
        school: m.winner_school, school_name: m.winner_school_name,
        seed: m.winner_seed, grade: m.winner_grade,
      })
    }
    if (m.loser_wrestler_id && !seen.has(m.loser_wrestler_id)) {
      seen.add(m.loser_wrestler_id)
      roster.push({
        wrestler_id: m.loser_wrestler_id, name: m.loser_name ?? '—',
        school: m.loser_school, school_name: m.loser_school_name,
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

function EntryRoster({ roster }: { roster: RosterEntry[] }) {
  if (roster.length === 0) return null
  return (
    <section className="mt-10">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Entries ({roster.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
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
                  <Link href={`/wrestler/${r.wrestler_id}`} className="font-medium text-slate-700 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-slate-500 text-xs">{r.school_name || r.school || '—'}</td>
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
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
              w === current
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm'
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
  const season = Math.max(await getActiveSeason(), 2)

  const { data } = await supabase.rpc('district_bracket', {
    p_district: district,
    p_weight: weight,
    p_gender: 'F',
    p_season: season,
  })

  const matches = (data ?? []) as MatchRow[]
  if (matches.length === 0) notFound()

  const champ  = matches.filter(m => m.bracket_side === 'championship')
  const consol = matches.filter(m => m.bracket_side === 'consolation')

  const champOrdered = orderChampMatches(champ)

  const r2Matches = champOrdered.get('R2') ?? []
  const r2Display = r2Matches.filter(m => m.loser_wrestler_id !== null)
  const champCols = CHAMP_COLS.filter(r => (champOrdered.get(r) ?? []).length > 0)

  const qfCount = (champOrdered.get('QF') ?? []).length || 1
  const totalH = qfCount * CARD_H

  const consolRounds = ['3rd_Place', '5th_Place', '7th_Place'].filter(r =>
    consol.some(m => m.round === r)
  )
  const consolByRound = new Map<string, MatchRow[]>()
  for (const m of consol) {
    const list = consolByRound.get(m.round) ?? []
    list.push(m)
    consolByRound.set(m.round, list)
  }

  const allRoundsOrdered = [
    ...(['R2'] as const).filter(() => r2Display.length > 0),
    ...champCols,
    ...consolRounds,
  ]

  return (
    <div className="max-w-fit mx-auto px-4 py-8">
      <Link
        href={`/girls/districts/${district}`}
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← District {district}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-purple-900">
          District {district}
          <span className="text-slate-400 font-normal ml-2">·</span>
          <span className="text-slate-600 font-semibold ml-2">{weight} lb</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">NJSIAA {SEASONS[season]?.label ?? season} · Girls postseason</p>
      </div>

      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/districts/${district}`} />

      {r2Display.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Prelims
          </h2>
          <div className="flex gap-3 flex-wrap">
            {r2Display.map(m => <MatchCard key={m.match_id} m={m} />)}
          </div>
        </div>
      )}

      {/* ── DESKTOP bracket ── */}
      <div className="hidden md:block">
        <div className="flex gap-0 items-start">
          {champCols.map((round, ri) => {
            const colMatches = champOrdered.get(round) ?? []
            const slotH = totalH / colMatches.length

            return (
              <div key={round} className="flex flex-col shrink-0">
                <div className="h-8 flex items-center justify-center px-4">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {ROUND_LABEL[round] ?? round}
                  </span>
                </div>
                {colMatches.map(m => (
                  <div
                    key={m.match_id}
                    className="flex items-center justify-center px-2"
                    style={{ height: slotH }}
                  >
                    <MatchCard m={m} />
                  </div>
                ))}
                {ri === champCols.length - 1 && consolRounds.length > 0 && (
                  <div style={{ height: 16 }} />
                )}
              </div>
            )
          })}

          {consolRounds.length > 0 && (
            <div className="flex flex-col shrink-0">
              <div className="h-8 flex items-center justify-center px-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  {ROUND_LABEL[consolRounds[0]]}
                </span>
              </div>
              <div
                className="flex items-center justify-center px-2"
                style={{ height: totalH }}
              >
                <MatchCard m={(consolByRound.get(consolRounds[0]) ?? [])[0]!} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE bracket ── */}
      <div className="md:hidden space-y-6">
        {allRoundsOrdered.map(round => {
          const ms = round === 'R2'
            ? r2Display
            : round === 'QF' || round === 'SF' || round === 'F'
              ? (champOrdered.get(round) ?? [])
              : (consolByRound.get(round) ?? [])
          if (ms.length === 0) return null
          return (
            <MobileRound
              key={round}
              label={ROUND_LABEL[round] ?? round}
              matches={ms}
            />
          )
        })}
      </div>
      <EntryRoster roster={buildRoster(matches)} />
      <WeightNav weights={WEIGHTS} current={weight} base={`/girls/districts/${district}`} />
    </div>
  )
}
