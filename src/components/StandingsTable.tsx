import Link from 'next/link'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import type { PPStandingsRow } from '@/lib/standings'

type PostseasonRow = {
  id?: number
  display_name: string
  mascot: string | null
  primary_color: string | null
  header_background: string | null
  logo_url: string | null
  district_points: number
  region_points: number
  state_points: number
  total_points: number
}

function SchoolCell({ s, gender }: { s: { id?: number; display_name: string; mascot: string | null; primary_color: string | null; header_background: string | null; logo_url: string | null }; gender: string }) {
  return (
    <Link href={`/${gender}/schools/${s.id}`} className="flex items-center gap-3 group">
      {s.logo_url ? (
        <SchoolLogoBadge logoUrl={s.logo_url} bgColor={s.header_background ?? s.primary_color} large />
      ) : s.primary_color ? (
        <div
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
          style={{ backgroundColor: s.header_background ?? s.primary_color }}
        >
          {s.display_name.slice(0, 2).toUpperCase()}
        </div>
      ) : null}
      <div>
        <span className="font-medium text-slate-800 group-hover:underline">{s.display_name}</span>
        {s.mascot && <span className="text-xs text-slate-400 ml-1.5">{s.mascot}</span>}
      </div>
    </Link>
  )
}

export function PowerPointTable({ standings, gender }: { standings: PPStandingsRow[]; gender: string }) {
  return (
    <div className="border border-black rounded-none overflow-hidden shadow-none bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-center px-3 py-3 font-medium text-slate-500 w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">School</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-20">W-L</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-16">PCT</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Power Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map(s => (
              <tr key={s.display_name} className="hover:bg-slate-50">
                <td className="text-center px-3 py-3 text-slate-400 tabular-nums">{s.rank}</td>
                <td className="px-4 py-3"><SchoolCell s={s} gender={gender} /></td>
                <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.wins}-{s.losses}</td>
                <td className="text-right px-4 py-3 tabular-nums text-slate-500">{(s.pct * 1000 | 0) / 1000 === 0 && s.wins === 0 ? '—' : s.pct.toFixed(3).replace(/^0/, '')}</td>
                <td className="text-right px-4 py-3 tabular-nums font-semibold text-slate-900">{s.power_points.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StandingsTable({ standings, gender }: { standings: PostseasonRow[]; gender: string }) {
  return (
    <div className="border border-black rounded-none overflow-hidden shadow-none bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-center px-3 py-3 font-medium text-slate-500 w-12">#</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">School</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Districts</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Regions</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">State</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500 w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((s, i) => (
              <tr key={s.display_name} className="hover:bg-slate-50">
                <td className="text-center px-3 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-4 py-3"><SchoolCell s={s} gender={gender} /></td>
                <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.district_points || '—'}</td>
                <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.region_points || '—'}</td>
                <td className="text-right px-4 py-3 tabular-nums text-slate-700">{s.state_points || '—'}</td>
                <td className="text-right px-4 py-3 tabular-nums font-semibold text-slate-900">{s.total_points || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
