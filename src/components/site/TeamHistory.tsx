// The Team Post Season History tab (Kyle 2026-11-16): the state champion, then the sectional champions, by year — years
// across the top and scrolling sideways, as Champions by Weight does on the individual History tabs. Data: src/lib/teamHistory.ts
import { SchoolTag } from '@/components/SchoolTag'
import { NjwhLink } from '@/components/site/NjwhLink'
import type { TeamHistoryGroup } from '@/lib/teamHistory'

const th = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap'

export function TeamHistoryTable({ group, credit }: { group: TeamHistoryGroup; credit?: boolean }) {
  const years = [...new Set(group.champs.map(c => c.year))].sort((a, b) => b - a)
  const champ = new Map(group.champs.map(c => [`${c.row}|${c.year}`, c]))
  const label = (y: number) => `${y - 1}-${String(y).slice(-2)}`
  if (!years.length) return <p className="text-sm text-slate-500">No champions on file yet.</p>
  return (
    <section className="mb-10">
      <h2 className="mb-0.5 text-base font-semibold text-slate-800">{group.key === 'girls' ? 'Team Champions' : `${group.label} Team Champions`}</h2>
      <p className="mb-3 text-xs font-medium text-slate-500">Goes back to {label(years[years.length - 1])}.</p>
      <div className="overflow-x-auto border border-black">
        <table className="text-[12px]">
          <thead><tr className="bg-slate-900 text-white">
            <th className={`${th} sticky left-0 bg-slate-900`}>Champion</th>
            {years.map(y => <th key={y} className={th}>{label(y)}</th>)}
          </tr></thead>
          <tbody>
            {group.rows.map((r, i) => (
              <tr key={r} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                <td className={`px-3 py-1 whitespace-nowrap sticky left-0 font-bold ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>{r}</td>
                {years.map(y => { const c = champ.get(`${r}|${y}`); return (
                  <td key={y} className="px-3 py-1 align-top whitespace-nowrap">
                    {c ? (c.school_id != null ? <SchoolTag id={c.school_id} name={c.school} /> : <span>{c.school}</span>) : <span className="text-slate-300">—</span>}
                  </td>) })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {credit && (() => {
        const ours = group.champs.filter(c => !c.njwh).map(c => c.year)
        if (!group.champs.some(c => c.njwh)) return null
        return <p className="mt-2 text-xs text-slate-500">Team champions {ours.length ? `before ${label(Math.min(...ours))} ` : ''}are from <NjwhLink />.</p>
      })()}
    </section>
  )
}
