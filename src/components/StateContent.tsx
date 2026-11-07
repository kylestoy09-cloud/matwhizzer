import Link from 'next/link'
import { WeightTiles } from '@/components/site/PostseasonParts'
import { IconHint } from '@/components/site/IconHint'
import { BracketBuster } from '@/components/BracketBuster'
import { TeamScoreCard } from '@/components/TeamScoreCard'
import { IndividualTeamPoints } from '@/components/IndividualTeamPoints'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { SchoolTag } from '@/components/SchoolTag'
import type { FastestPinRow, FastestTfRow, MatTimeRow, PlacementRow, StateData } from '@/lib/stateData/shared'

// The state section's display. Each side loads its own data under its own rules
// (src/lib/stateData/boys.ts, girls.ts); this only lays it out.

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard<T extends { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null; school_id?: number | null; logo_url?: string | null; bg_color?: string | null }>({
  title, rows, subtitle, value, note,
}: {
  title: string; rows: T[]
  subtitle: (r: T) => string; value: (r: T) => string; note?: string
}) {
  return (
    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
        {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No data</p>}
        {rows.map((r, i) => (
          <div key={`${r.wrestler_id}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <SchoolLogoBadge logoUrl={r.logo_url} bgColor={r.bg_color} />
            <div className="flex-1 min-w-0">
              <Link href={`/wrestler/${r.wrestler_id}`} className="text-sm font-medium text-slate-800 hover:underline truncate block">
                {r.wrestler_name}
              </Link>
              <div className="text-[11px] text-slate-400 truncate">{subtitle(r)}</div>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{value(r)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export function StateContent({ gender, season, data }: { gender: 'M' | 'F', season: number, data: StateData }) {
  const isBoys = gender === 'M'
  const { weights: WEIGHTS, placements, matTime, fastPin, fastTf, teamScore, teamPts, distStrength, podiumDist, margins, ghostChamps, seedMap, logos } = data

  const PLACES = [1, 2, 3, 4, 5, 6, 7, 8]

  const PLACE_LABEL: Record<number, string> = {
    1: 'Champion', 2: 'Runner-Up', 3: '3rd Place', 4: '4th Place',
    5: '5th Place', 6: '6th Place', 7: '7th Place', 8: '8th Place',
  }

  const bracketBase  = isBoys ? '/boys/state' : '/girls/state'
  const schoolPrefix = '/schools'

  // Ghost champion wrestler IDs
  const ghostIds = new Set(ghostChamps.map(gc => gc.wrestler_id))

  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <>
      {/* ── Bracket grid ── */}
      <div className="mb-8"><WeightTiles side={isBoys ? 'boys' : 'girls'} hrefBase={bracketBase} weights={WEIGHTS} /></div>

      {/* ── Placewinners ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">State Placewinners</h2>
        <div className="overflow-x-auto rounded-none border border-black shadow-none">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-14">Wt</th>
                {PLACES.map(place => (
                  <th key={place} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {PLACE_LABEL[place]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEIGHTS.map((w, i) => {
                const row = placementsByWeight.get(w) ?? new Map<number, PlacementRow>()
                return (
                  <tr key={w} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-4 py-2.5 font-bold text-slate-700">{w}</td>
                    {PLACES.map(place => {
                      const p = row.get(place)
                      if (!p) return <td key={place} className="px-4 py-2.5 text-slate-300">—</td>
                      const seed = seedMap.get(p.wrestler_id)
                      const outperform = seed != null ? seed - place : 0
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/wrestler/${p.wrestler_id}`}
                              className={`font-medium hover:underline leading-tight ${place === 1 ? 'text-slate-900' : 'text-slate-700'}`}
                            >
                              {p.wrestler_name}
                            </Link>
                            {place === 1 && <IconHint hint="State champion">👑</IconHint>}
                            {ghostIds.has(p.wrestler_id) && (
                              <IconHint hint={seed ? `Ghost champion: won the state title as the #${seed} seed (seeded 5th or lower)` : 'Ghost champion: won the state title seeded 5th or lower'}>👻</IconHint>
                            )}
                            {outperform > 5 && (
                              <IconHint hint={`Seeded #${seed}, finished ${place}${place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'}: ${outperform} spots better than seeded`} className="text-[10px] font-bold text-emerald-600">
                                ↑{outperform}
                              </IconHint>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 truncate block">
                            <SchoolTag id={p.school_id} name={p.school_name} className="text-xs text-slate-500" />
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── State Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">State Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard<MatTimeRow>
            title="The Terminators"
            note="Total Tourney Mat Time"
            rows={matTime}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.match_count} wins`}
            value={r => fmtTime(r.total_seconds)}
          />
          <StatCard<FastestPinRow>
            title="Quickest Deck"
            rows={fastPin}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />
          <StatCard<FastestTfRow>
            title="Quickest Tech"
            rows={fastTf}
            subtitle={r => `${r.school_id != null ? r.school_name : 'TBD'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />
          <TeamScoreCard rows={teamScore} gender={isBoys ? 'boys' : 'girls'} />
        </div>
      </section>

      {/* ── Individual Team Points ── */}
      {teamPts.length > 0 && (
        <section className="mb-10">
          <IndividualTeamPoints rows={teamPts} />
        </section>
      )}

      {/* ── Strongest Districts + Podium Placers ── */}
      {(distStrength.length > 0 || podiumDist.length > 0) && (
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {distStrength.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-3">Strongest Districts</h2>
                <div className="overflow-x-auto rounded-none border border-black shadow-none">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">District</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">State Qualifiers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distStrength.slice(0, 12).map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.district_name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.state_qualifiers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {podiumDist.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-800 mb-3">Most Podium Placers by District</h2>
                <div className="overflow-x-auto rounded-none border border-black shadow-none">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">District</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Podium Placers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {podiumDist.slice(0, 12).map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                          <td className="px-3 py-2 font-medium text-slate-800">{r.district_name}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.podium_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── The Margins ── */}
      {margins.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-slate-800 mb-3">The Margins</h2>
          <p className="text-xs text-slate-500 mb-2">Average score margin in DEC + MD — tightest first</p>
          <div className="overflow-x-auto rounded-none border border-black shadow-none max-w-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Weight</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Avg Margin</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Matches</th>
                </tr>
              </thead>
              <tbody>
                {margins.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-3 py-2 font-medium text-slate-800 tabular-nums">{r.weight} lb</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={`font-bold ${Number(r.avg_margin) <= 3 ? 'text-emerald-600' : Number(r.avg_margin) <= 6 ? 'text-amber-600' : 'text-slate-700'}`}>
                        +{r.avg_margin}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{r.match_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Ghost Champions ── */}
      {ghostChamps.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Ghost Champions</h2>
          <p className="text-xs text-slate-500 mb-3">Wrestlers seeded 5th or lower who won a state championship</p>
          <div className="space-y-3">
            {ghostChamps
              .sort((a, b) => b.seed - a.seed)
              .map(gc => (
              <div key={`${gc.wrestler_id}-${gc.weight}`} className="bg-white border border-black rounded-none shadow-none overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl font-black text-amber-500 w-10 text-center shrink-0">
                    {gc.seed}
                  </span>
                  <SchoolLogoBadge {...logos.badgeById(gc.school_id)} />
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/wrestler/${gc.wrestler_id}`}
                      className="text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {gc.wrestler_name}
                    </Link>
                    <div className="text-xs text-slate-500">{gc.school_id != null ? gc.school : 'TBD'} · {gc.weight}lb</div>
                  </div>
                </div>
                {gc.wins_on_path && gc.wins_on_path.length > 0 && (
                  <div className="border-t border-slate-100 px-4 py-2 bg-slate-50">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {gc.wins_on_path.map((w, j) => (
                        <span key={j}>
                          <span className="font-medium text-slate-600">{w.round}</span>
                          {' '}beat{' '}
                          <span className="text-slate-700">
                            {w.opponent_seed != null && <span className="text-amber-600">#{w.opponent_seed} </span>}
                            {w.opponent}
                          </span>
                          {' '}
                          <span className="text-slate-400">({w.win_type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Bracket Buster ── */}
      <section className="mb-10">
        <BracketBuster
          season={season}
          gender={gender}
          tournamentType="state"
          title="Bracket Buster — State Upsets"
          limit={10}
          schoolBase={schoolPrefix}
          accentColor={isBoys ? 'slate' : 'rose'}
        />
      </section>

    </>
  )
}
