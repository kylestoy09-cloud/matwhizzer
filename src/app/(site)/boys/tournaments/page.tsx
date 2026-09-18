import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

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

export default async function BoysTournamentsPage() {
  const [{ data: tournsData }, { data: winnersData }] = await Promise.all([
    supabase
      .from('in_season_tournaments')
      .select('id, name, start_date, end_date, tournament_type')
      .order('start_date', { ascending: false }),
    supabase
      .from('in_season_tournament_team_scores')
      .select('tournament_id, school_name, score')
      .eq('place', 1),
  ])

  const rows = (tournsData ?? []) as { id: string; name: string; start_date: string; end_date: string | null; tournament_type: string | null }[]
  const winnersMap = new Map<string, { school_name: string; score: number }>()
  for (const w of (winnersData ?? []) as { tournament_id: string; school_name: string; score: number }[]) {
    winnersMap.set(w.tournament_id, w)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Boys Tournaments</h1>

      {rows.length === 0 ? (
        <div className="border border-black rounded-none bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No tournaments found.</p>
        </div>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto">
          <table className="min-w-max w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Tournament</th>
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Winner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => {
                const winner = winnersMap.get(t.id)
                return (
                  <tr key={t.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-1">
                      <Link href={`/tournaments/${t.id}`} className="font-medium text-slate-800 hover:underline">
                        {t.name}
                      </Link>
                      {t.tournament_type === 'outside' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-900 text-white">Out of State</span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDateRange(t.start_date, t.end_date)}
                    </td>
                    <td className="px-3 py-1 text-slate-700 whitespace-nowrap">
                      {winner ? winner.school_name : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
