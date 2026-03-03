import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

type PlacementRow = {
  weight: number; place: number; wrestler_id: string
  wrestler_name: string; school: string | null; school_name: string | null
}
type MatTimeRow = {
  wrestler_id: string; wrestler_name: string
  school: string | null; school_name: string | null
  total_seconds: number; match_count: number
}
type FastestPinRow = {
  wrestler_id: string; wrestler_name: string
  school: string | null; school_name: string | null
  fall_time_seconds: number; weight: number
}
type FastestTfRow = FastestPinRow
type BonusPctRow = {
  wrestler_id: string; wrestler_name: string
  school: string | null; school_name: string | null
  bonus_wins: number; total_wins: number; bonus_pct: number
}
type TeamScoreRow = { school: string; school_name: string | null; total_points: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard<T extends { wrestler_id: string; wrestler_name: string; school: string | null; school_name: string | null }>({
  title, rows, subtitle, value, note,
}: {
  title: string; rows: T[]
  subtitle: (r: T) => string; value: (r: T) => string; note?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</h3>
        {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No data</p>}
        {rows.map((r, i) => (
          <div key={`${r.wrestler_id}-${i}`} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
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

function TeamScoreCard({ rows, schoolPrefix }: { rows: TeamScoreRow[]; schoolPrefix: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Team Scoring</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No data</p>}
        {rows.map((r, i) => (
          <div key={r.school ?? i} className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <Link href={`${schoolPrefix}/${encodeURIComponent(r.school)}`} className="text-sm font-medium text-slate-800 hover:underline truncate block">
                {r.school_name || r.school || '—'}
              </Link>
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">{r.total_points} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export async function StateContent({ gender }: { gender: 'M' | 'F' }) {
  const isBoys = gender === 'M'

  const WEIGHTS = isBoys
    ? [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
    : [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

  const PLACES = isBoys ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4]

  const PLACE_LABEL: Record<number, string> = {
    1: 'Champion', 2: 'Runner-Up', 3: '3rd Place', 4: '4th Place',
    5: '5th Place', 6: '6th Place', 7: '7th Place', 8: '8th Place',
  }

  const bracketBase  = isBoys ? '/boys/state' : '/girls/state'
  const schoolPrefix = isBoys ? '/boys/schools' : '/girls/schools'
  const g = gender

  const [placementsRes, matTimeRes, fastPinRes, fastTfRes, bonusPctRes, teamScoreRes] =
    await Promise.all([
      supabase.rpc('state_placements',  { p_gender: g }),
      supabase.rpc('state_mat_time',    { p_gender: g }),
      supabase.rpc('state_fastest_pin', { p_gender: g }),
      supabase.rpc('state_fastest_tf',  { p_gender: g }),
      supabase.rpc('state_bonus_pct',   { p_gender: g }),
      supabase.rpc('state_team_score',  { p_gender: g }),
    ])

  const placements = (placementsRes.data ?? []) as PlacementRow[]
  const matTime    = (matTimeRes.data    ?? []) as MatTimeRow[]
  const fastPin    = (fastPinRes.data    ?? []) as FastestPinRow[]
  const fastTf     = (fastTfRes.data     ?? []) as FastestTfRow[]
  const bonusPct   = (bonusPctRes.data   ?? []) as BonusPctRow[]
  const teamScore  = (teamScoreRes.data  ?? []) as TeamScoreRow[]

  const placementsByWeight = new Map<number, Map<number, PlacementRow>>()
  for (const p of placements) {
    if (!placementsByWeight.has(p.weight)) placementsByWeight.set(p.weight, new Map())
    placementsByWeight.get(p.weight)!.set(p.place, p)
  }

  return (
    <>
      {/* ── State Leaders ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">State Leaders</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard<MatTimeRow>
            title="Least Mat Time"
            note={`lower = more dominant · min ${isBoys ? 3 : 2} champ wins`}
            rows={matTime}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.match_count} wins`}
            value={r => fmtTime(r.total_seconds)}
          />
          <StatCard<FastestPinRow>
            title="Fastest Pin"
            rows={fastPin}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />
          <StatCard<FastestTfRow>
            title="Fastest Tech Fall"
            rows={fastTf}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.weight} lb`}
            value={r => fmtTime(r.fall_time_seconds)}
          />
          <StatCard<BonusPctRow>
            title="Bonus Point %"
            rows={bonusPct}
            subtitle={r => `${r.school_name || r.school || '—'} · ${r.bonus_wins}/${r.total_wins} wins`}
            value={r => `${r.bonus_pct}%`}
          />
          <TeamScoreCard rows={teamScore} schoolPrefix={schoolPrefix} />
        </div>
      </section>

      {/* ── Placewinners ── */}
      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-3">State Placewinners</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
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
                      return (
                        <td key={place} className="px-4 py-2.5">
                          <Link
                            href={`/wrestler/${p.wrestler_id}`}
                            className={`block font-medium hover:underline leading-tight ${place === 1 ? 'text-slate-900' : 'text-slate-700'}`}
                          >
                            {p.wrestler_name}
                          </Link>
                          <span className="text-[11px] text-slate-400 truncate block max-w-[140px]">
                            {p.school_name || p.school}
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

      {/* ── Brackets ── */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Brackets</h2>
        <div className={`grid gap-2 ${isBoys ? 'grid-cols-4 sm:grid-cols-7' : 'grid-cols-4 sm:grid-cols-6'}`}>
          {WEIGHTS.map(w => (
            <Link
              key={w}
              href={`${bracketBase}/${w}`}
              className="flex flex-col items-center justify-center py-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
            >
              <span className="text-base font-bold text-slate-800">{w}</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">lbs</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
