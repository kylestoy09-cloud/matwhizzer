// The Tournaments page for one side (2026-11-07): the standard header (title, season picker, summary)
// with month tabs, then the live table (Tournament, Date, Winner) for the picked season and month.
// The page opens on the month of the latest tournament that has started (else the first month).
import Link from 'next/link'
import { supabase } from '@/lib/supabase/public-cached'
import { SchoolTag } from '@/components/SchoolTag'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { SiteTabs } from '@/components/site/SiteTabs'
import { StdHeader } from '@/components/site/StdPage'
import { getActiveSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'

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

const monthName = (ym: string) => new Date(`${ym}-15T12:00:00`).toLocaleDateString('en-US', { month: 'long' })

export async function TournamentsList({ gender, month }: { gender: 'M' | 'F'; month: string | undefined }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const season = await getActiveSeason(gender)
  const label = await getSeasonLabel(season)
  const [{ data: tournsData }, { data: winnersData }] = await Promise.all([
    supabase
      .from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')
      .select('id, name, start_date, end_date, tournament_type')
      .eq('season', label ?? '')
      .order('start_date', { ascending: false }),
    supabase
      .from('in_season_tournament_team_scores')   // both sides' winners (as before)
      .select('tournament_id, score, school:schools!school_id(id, display_name, logo_url, header_background)')
      .eq('place', 1),
  ])

  const rows = (tournsData ?? []) as { id: string; name: string; start_date: string; end_date: string | null; tournament_type: string | null }[]
  type Winner = { tournament_id: string; score: number; school: { id: number; display_name: string; logo_url: string | null; header_background: string | null } | null }
  const winnersMap = new Map<string, Winner>()
  for (const w of (winnersData ?? []) as unknown as Winner[]) {
    winnersMap.set(w.tournament_id, w)
  }

  const months = [...new Set(rows.map(r => r.start_date.slice(0, 7)))].sort()
  const today = new Date().toISOString().slice(0, 10)
  const started = rows.filter(r => r.start_date <= today).map(r => r.start_date.slice(0, 7)).sort()
  const active = month && months.includes(month) ? month : (started.at(-1) ?? months[0])
  const shown = rows.filter(r => r.start_date.slice(0, 7) === active)
  const base = `/${side}/tournaments`

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <StdHeader title={`${gender === 'F' ? 'Girls' : 'Boys'} Tournaments`} summaryKey="tournaments"
        picker={<InlineSeasonPicker gender={gender} activeSeason={season} />}
        tabs={months.length > 0 ? <SiteTabs items={months.map(m => ({ key: m, label: monthName(m), href: `${base}?month=${m}` }))} active={active} /> : undefined} />

      {shown.length === 0 ? (
        <div className="border border-black rounded-none bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No tournaments yet this season.</p>
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
              {shown.map((t, i) => {
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
                      {winner?.school ? <SchoolTag id={winner.school.id} name={winner.school.display_name} className="" /> : <span className="text-slate-300">—</span>}
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
