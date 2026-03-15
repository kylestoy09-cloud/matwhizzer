import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type UpsetRow = {
  winner_id: string
  winner_name: string
  winner_school: string | null
  winner_school_name: string | null
  winner_seed: number
  loser_id: string
  loser_name: string
  loser_school: string | null
  loser_school_name: string | null
  loser_seed: number
  seed_gap: number
  win_type: string
  weight: number
  round: string
  tournament_name: string
  tournament_label: string
}

function gapColor(gap: number): string {
  if (gap >= 9) return 'text-red-700 bg-red-50 border-red-200'
  if (gap >= 6) return 'text-orange-700 bg-orange-50 border-orange-200'
  if (gap >= 3) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-slate-600 bg-slate-50 border-slate-200'
}

const ROUND_LABEL: Record<string, string> = {
  R1: 'R1', R2: 'R2', QF: 'QF', SF: 'SF', F: 'Final',
  C1: 'C1', C2: 'C2', '3rd_Place': '3rd', '5th_Place': '5th', '7th_Place': '7th',
}

export async function BracketBuster({
  season,
  gender,
  tournamentType = 'all',
  region,
  district,
  title = 'Bracket Buster',
  limit = 8,
  schoolBase = '/boys/schools',
  accentColor = 'slate',
}: {
  season: number
  gender: 'M' | 'F'
  tournamentType?: 'all' | 'districts' | 'regions' | 'state'
  region?: number
  district?: number
  title?: string
  limit?: number
  schoolBase?: string
  accentColor?: 'slate' | 'rose'
}) {
  const params: Record<string, unknown> = {
    p_gender: gender,
    p_season: season,
    p_tournament_type: tournamentType,
    p_limit: limit,
  }
  if (region != null) params.p_region = region
  if (district != null) params.p_district = district

  const { data } = await supabase.rpc('bracket_buster_detail', params)
  const rows = (data ?? []) as UpsetRow[]

  if (rows.length === 0) return null

  const headColor = accentColor === 'rose' ? 'text-rose-500' : 'text-slate-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className={`text-xs font-semibold ${headColor} uppercase tracking-wide`}>{title}</h3>
        <p className="text-[10px] text-slate-400 mt-0.5">Higher seed beats lower seed · ranked by seed gap</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] text-slate-400 uppercase tracking-wide">
              <th className="px-3 py-2 text-left w-6">#</th>
              <th className="px-2 py-2 text-center w-14">Gap</th>
              <th className="px-3 py-2 text-left">Winner</th>
              <th className="px-2 py-2 text-center w-10">Sd</th>
              <th className="px-3 py-2 text-left">Defeated</th>
              <th className="px-2 py-2 text-center w-10">Sd</th>
              <th className="px-2 py-2 text-center w-12">Wt</th>
              <th className="px-2 py-2 text-left w-16">Rnd</th>
              <th className="px-2 py-2 text-left">Result</th>
              {tournamentType === 'all' && <th className="px-2 py-2 text-left">Tourney</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r, i) => (
              <tr key={`${r.winner_id}-${r.loser_id}-${i}`} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-2 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${gapColor(r.seed_gap)}`}>
                    +{r.seed_gap}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/wrestler/${r.winner_id}`} className="font-medium text-slate-800 hover:underline text-sm truncate block max-w-[140px]">
                    {r.winner_name}
                  </Link>
                  <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">{r.winner_school_name || r.winner_school}</span>
                </td>
                <td className="px-2 py-2 text-center text-xs font-bold text-slate-700 tabular-nums">#{r.winner_seed}</td>
                <td className="px-3 py-2">
                  <Link href={`/wrestler/${r.loser_id}`} className="text-slate-500 hover:underline text-sm truncate block max-w-[140px]">
                    {r.loser_name}
                  </Link>
                  <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">{r.loser_school_name || r.loser_school}</span>
                </td>
                <td className="px-2 py-2 text-center text-xs font-medium text-slate-500 tabular-nums">#{r.loser_seed}</td>
                <td className="px-2 py-2 text-center text-xs text-slate-600 tabular-nums">{r.weight}</td>
                <td className="px-2 py-2 text-xs text-slate-500">{ROUND_LABEL[r.round] || r.round}</td>
                <td className="px-2 py-2 text-xs text-slate-500">{r.win_type}</td>
                {tournamentType === 'all' && (
                  <td className="px-2 py-2 text-xs text-slate-400 whitespace-nowrap">{r.tournament_label}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
