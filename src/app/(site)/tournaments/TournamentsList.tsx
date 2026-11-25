// The Tournaments page for one side (2026-11-07): the standard header (title, season picker, summary)
// with Tournaments / Jamborees tabs on the girls side (Kyle 2026-11-11; the boys have no jamborees) and month
// tabs under them, then the table for the
// picked season, kind and month: Tournament, Date, Winner (from the copied standings), or Jamboree, Date,
// Teams, Top Team, Pts, Record (team points by standard dual scoring, src/lib/jamboreeResults.ts).
// The page opens on the month of the latest event that has started (else the first month).
import Link from 'next/link'
import { supabase } from '@/lib/supabase/public-cached'
import { SchoolTag } from '@/components/SchoolTag'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { SiteTabs } from '@/components/site/SiteTabs'
import { StdHeader } from '@/components/site/StdPage'
import { getActiveSeason } from '@/lib/get-season'
import { getSeasonLabel } from '@/lib/seasons-server'
import { jamboreeTeams, jamboreeRecord, type JamboreeTeam } from '@/lib/jamboreeResults'

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

export async function TournamentsList({ gender, month, kind }: { gender: 'M' | 'F'; month: string | undefined; kind: 'tournaments' | 'jamborees' }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const season = await getActiveSeason(gender)
  const label = await getSeasonLabel(season)
  const [{ data: tournsData }, { data: winnersData }] = await Promise.all([
    supabase
      .from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')
      .select('id, name, start_date, end_date, tournament_type')
      .eq('season', label ?? '')
      .order('start_date', { ascending: false }),
    // the top NJSIAA team (Kyle 2026-11-20: a CT school topped Sam Cali) — the best-placed NJ school per tournament
    supabase
      .from('in_season_tournament_team_scores')
      .select('tournament_id, place, score, school:schools!school_id(id, display_name, logo_url, header_background, is_nj)')
      .lte('place', 10)
      .order('place'),
  ])

  const isJam = gender === 'F' && kind === 'jamborees'   // jamborees are girls only (Kyle 2026-11-11)
  const { data: jamsData } = isJam
    ? await supabase.from(gender === 'F' ? 'jamborees_girls' : 'jamborees')
        .select('id, name, start_date, end_date').eq('season', label ?? '').order('start_date', { ascending: false })
    : { data: null }
  const rows = (isJam ? jamsData ?? [] : tournsData ?? []) as { id: string; name: string; start_date: string; end_date: string | null; tournament_type?: string | null }[]
  type Winner = { tournament_id: string; place: number; score: number; school: { id: number; display_name: string; logo_url: string | null; header_background: string | null; is_nj: boolean } | null }
  const winnersMap = new Map<string, Winner>()
  for (const w of (winnersData ?? []) as unknown as Winner[]) {
    if (w.school?.is_nj && !winnersMap.has(w.tournament_id)) winnersMap.set(w.tournament_id, w)
  }

  const months = [...new Set(rows.map(r => r.start_date.slice(0, 7)))].sort()
  const today = new Date().toISOString().slice(0, 10)
  const started = rows.filter(r => r.start_date <= today).map(r => r.start_date.slice(0, 7)).sort()
  const active = month && months.includes(month) ? month : (started.at(-1) ?? months[0])
  const shown = rows.filter(r => r.start_date.slice(0, 7) === active)
  const base = `/${side}/tournaments`
  const kindQ = isJam ? 'kind=jamborees&' : ''

  // Jamborees: each shown jamboree's teams, from its pairings
  const jamTeams = new Map<string, JamboreeTeam[]>()
  const schoolNames = new Map<number, string>()
  if (isJam && shown.length) {
    const { data: pairings } = await supabase.from(gender === 'F' ? 'dual_meets_girls' : 'dual_meets')
      .select('id, jamboree_id, team1_school_id, team2_school_id, team1_score, team2_score')
      .in('jamboree_id', shown.map(r => r.id)).order('id').range(0, 4999)
    for (const r of shown) jamTeams.set(r.id, jamboreeTeams((pairings ?? []).filter(p => p.jamboree_id === r.id)))
    const tops = [...new Set([...jamTeams.values()].flatMap(ts => ts.filter(t => t.pts === ts[0]?.pts).map(t => t.school_id)))]
    if (tops.length) {
      const { data: sch } = await supabase.from('schools').select('id, display_name').in('id', tops)
      for (const x of sch ?? []) schoolNames.set(x.id, x.display_name)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <StdHeader title={`${gender === 'F' ? 'Girls' : 'Boys'} Tournaments`} summaryKey="tournaments"
        picker={<InlineSeasonPicker gender={gender} activeSeason={season} />}
        tabs={<>
          {gender === 'F' && <SiteTabs items={[{ key: 'tournaments', label: 'Tournaments', href: base }, { key: 'jamborees', label: 'Jamborees', href: `${base}?kind=jamborees` }]} active={isJam ? 'jamborees' : 'tournaments'} />}
          {months.length > 0 && <SiteTabs level={gender === 'F' ? 2 : 1} items={months.map(m => ({ key: m, label: monthName(m), href: `${base}?${kindQ}month=${m}` }))} active={active} />}
        </>} />

      {shown.length === 0 ? (
        <div className="border border-black rounded-none bg-white p-8 text-center">
          <p className="text-sm text-slate-500">No {isJam ? 'jamborees' : 'tournaments'} yet this season.</p>
        </div>
      ) : isJam ? (
        <div className="border border-black rounded-none overflow-x-auto">
          <table className="min-w-max w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                {['Jamboree', 'Date', 'Teams', 'Top Team', 'Pts', 'Record'].map(c => (
                  <th key={c} className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((j, i) => {
                const teams = jamTeams.get(j.id) ?? []
                const top = teams.filter(t => t.pts === teams[0]?.pts)
                return (
                  <tr key={j.id} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-3 py-1">
                      <Link href={`/jamborees/${j.id}`} className="font-medium text-slate-800 hover:underline">{j.name}</Link>
                    </td>
                    <td className="px-3 py-1 text-slate-500 whitespace-nowrap tabular-nums">{formatDateRange(j.start_date, j.end_date)}</td>
                    <td className="px-3 py-1 text-slate-700 tabular-nums">{teams.length || '—'}</td>
                    <td className="px-3 py-1 text-slate-700 whitespace-nowrap">
                      {top.length === 0 ? <span className="text-slate-300">—</span> : (
                        <span className="inline-flex items-center gap-2">
                          {top.map((t, k) => <span key={t.school_id} className="inline-flex items-center gap-2">{k > 0 && <span className="text-slate-400">/</span>}<SchoolTag id={t.school_id} name={schoolNames.get(t.school_id)} className="" /></span>)}
                          {top.length > 1 && <span className="text-xs text-slate-400">(tie)</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-slate-700 tabular-nums">{top[0]?.pts ?? '—'}</td>
                    <td className="px-3 py-1 text-slate-700 tabular-nums whitespace-nowrap">{top.length === 1 ? jamboreeRecord(top[0]) : top.length > 1 ? top.map(jamboreeRecord).join(' / ') : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto">
          <table className="min-w-max w-full text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Tournament</th>
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Top NJ Team</th>
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
