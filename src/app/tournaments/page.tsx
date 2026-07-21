import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type TournamentRow = {
  id: string
  name: string
  start_date: string
  end_date: string | null
}

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start + 'T12:00:00')
  if (!end || end === start) {
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const e = new Date(end + 'T12:00:00')
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${e.getDate()}, ${s.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default async function TournamentsPage() {
  const { data } = await supabase
    .from('in_season_tournaments')
    .select('id, name, start_date, end_date')
    .order('start_date', { ascending: false })

  const rows = (data ?? []) as TournamentRow[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Tournaments</h1>

      {rows.length === 0 ? (
        <div className="border border-black rounded-none bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No tournaments found.</p>
        </div>
      ) : (
        <div className="border border-black rounded-none overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">Tournament</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 w-44">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/tournaments/${t.id}`}
                      className="font-medium text-slate-800 hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {formatDateRange(t.start_date, t.end_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
