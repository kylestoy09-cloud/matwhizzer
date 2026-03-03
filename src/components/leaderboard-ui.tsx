import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

export type PinRow        = { wrestler_id: string; name: string; school: string | null; pin_count: number }
export type FastPinRow    = { wrestler_id: string; name: string; school: string | null; pin_count: number; fastest_seconds: number }
export type TfRow         = { wrestler_id: string; name: string; school: string | null; tf_count: number }
export type MdRow         = { wrestler_id: string; name: string; school: string | null; md_count: number }
export type WinPctRow     = { wrestler_id: string; name: string; school: string | null; wins: number; total: number; win_pct: number }
export type BonusRow      = { wrestler_id: string; name: string; school: string | null; bonus_count: number; total_wins: number }
export type TeamPointsRow = { school: string; school_name: string; total_points: number; match_count: number }
export type DomRow        = { wrestler_id: string; name: string; school: string | null; dominance_score: number; win_count: number }
export type DistrictRow   = { district_name: string; wrestlers_advancing: number; state_qualifiers: number }
export type SchoolRow     = { school: string; weight_classes_placed: number; wrestlers: number }
export type WeightRow     = { weight: number; gender: string; avg_margin: number; match_count: number }
export type ComebackRow   = { wrestler_id: string; name: string; school: string | null; lost_round: string; placed_round: string; tournament_name: string; weight: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

export function fmtTime(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function fmtSchool(s: string | null): string {
  return s ?? '—'
}

export function cleanTournament(name: string): string {
  return name.replace(/^Boy_s |^Girl_s /, '')
}

// ── Shared Components ─────────────────────────────────────────────────────────

export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
  )
}

type Col<T> = {
  label: string
  align: 'left' | 'right'
  render: (row: T) => React.ReactNode
}

export function LeaderTable<T extends object>({
  title,
  description,
  rows,
  cols,
}: {
  title: string
  description: string
  rows: T[]
  cols: Col<T>[]
}) {
  return (
    <section>
      <SectionHeader title={title} description={description} />
      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-slate-500 w-8">#</th>
              {cols.map(c => (
                <th
                  key={c.label}
                  className={`px-3 py-2 font-medium text-slate-500 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-4 text-center text-slate-400 text-xs">
                  No data
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400 text-xs tabular-nums">{i + 1}</td>
                {cols.map(c => (
                  <td
                    key={c.label}
                    className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function WrestlerCell({ id, name, school }: { id: string; name: string; school: string | null }) {
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

export function TabNav({ active, basePath }: { active: string; basePath: string }) {
  const tabs = [
    { key: 'wrestlers', label: 'Wrestler Leaderboards' },
    { key: 'analytics', label: 'Advanced Analytics' },
  ]
  return (
    <div className="flex gap-1 mb-8 border-b border-slate-200">
      {tabs.map(t => (
        <Link
          key={t.key}
          href={`${basePath}?tab=${t.key}`}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}

export const COMEBACK_ROUND_LABEL: Record<string, string> = {
  C1: 'Cons. R1', C2: 'Cons. R2',
  '3rd_Place': '3rd Place', '5th_Place': '5th Place',
}
