import { schoolNameMatches } from '@/lib/saintNames'
import { regionLabels } from '@/lib/postseasonSeason'
import { TournamentButtons } from '@/app/(site)/postseason/individual/IndividualButtons'
import { supabase } from '@/lib/supabase/public-cached'
import { getSeasons, getStateTournamentId } from '@/lib/seasons-server'
import Image from 'next/image'
import { getActiveSeason, getDirectorySeason } from '@/lib/get-season'
import { PostseasonLeaders } from '@/components/PostseasonLeaders'
import { StateChampions } from '@/components/StateChampions'
import { PageHeader } from '@/components/PageHeader'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

type WrestlerRow = { id: string; first_name: string; last_name: string }
type SchoolRow   = { school: string; school_name: string; school_id: number | null; total_points: number; wrestler_count: number }
type TeamScoreRow = { school: string; school_name: string | null; school_id: number | null; district_points: number; region_points: number; state_points: number; total_points: number }

export default async function GirlsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sq?: string }>
}) {
  const { q: rawQ, sq: rawSq } = await searchParams
  const q  = rawQ?.trim()  ?? ''
  const sq = rawSq?.trim() ?? ''
  const season = await getActiveSeason('F')
  const rl = await regionLabels('F', season)   // the region buttons' labels: the number, or a girls region's name
  const stateTid = await getStateTournamentId(season, 'F')
  const seasonEndYear = (await getSeasons()).find(x => x.id === season)?.end_year ?? 0

  const [wrestlerRes, schoolDirRes] = await Promise.all([
    q.length >= 2
      ? supabase.from('wrestlers').select('id, first_name, last_name')
          .eq('gender', 'F')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .order('last_name').order('first_name').limit(30)
      : Promise.resolve({ data: null }),
    sq.length >= 2
      ? supabase.rpc('school_directory', { p_gender: 'F', p_season: await getDirectorySeason('F') })   // last season's directory until the new one starts
      : Promise.resolve({ data: null }),
  ])

  const rawWrestlers = (wrestlerRes.data ?? []) as WrestlerRow[]
  const gradeMap: Record<string, string> = {}
  if (rawWrestlers.length > 0) {
    const { data: gradeRows } = await supabase
      .from('tournament_entries')
      .select('wrestler_id, grade_label')
      .in('wrestler_id', rawWrestlers.map(w => w.id))
      .not('grade_label', 'is', null)
      .order('tournament_id', { ascending: false })
    for (const gr of (gradeRows ?? []) as { wrestler_id: string; grade_label: string }[]) {
      if (!gradeMap[gr.wrestler_id]) gradeMap[gr.wrestler_id] = gr.grade_label
    }
  }
  const wrestlers = rawWrestlers

  let schools: SchoolRow[] = []
  if (sq.length >= 2 && schoolDirRes.data) {
    const ql = sq.toLowerCase()
    schools = (schoolDirRes.data as SchoolRow[])
      .filter(s => schoolNameMatches(s.school_name, ql) || schoolNameMatches(s.school, ql))   // "st" / "st." / "saint" alike
      .slice(0, 15)
  }

  const showLeaderboards = q.length < 2 && sq.length < 2

  let topTeamScores: TeamScoreRow[] = []
  let podiumSchools: { school_id: number; school_name: string; count: number; logo_url: string | null; bg_color: string | null }[] = []
  let stateChampions: { weight: number; wrestler_id: string; wrestler_name: string; school: string | null; school_id: number | null; seed: number | null; logo_url?: string | null; bg_color?: string | null }[] = []

  if (showLeaderboards) {
    const [teamScoreRes, placementsRes, championsRes, logos] = await Promise.all([
      supabase.rpc('top_postseason_team_scores', { p_gender: 'F', p_season: season, p_limit: 25 }),
      supabase.rpc('state_placements', { p_gender: 'F', p_season: season }),
      stateTid !== null ? supabase.rpc('state_champions', { p_tournament_id: stateTid }) : Promise.resolve({ data: [] }),
      getSchoolLogos(),
    ])
    topTeamScores = ((teamScoreRes.data ?? []) as TeamScoreRow[]).map(r => ({
      ...r,
      logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null,
      bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null,
    }))
    stateChampions = ((championsRes.data ?? []) as typeof stateChampions).map(r => ({
      ...r,
      logo_url: r.school_id != null ? (logos.byId.get(r.school_id) ?? null) : null,
      bg_color: r.school_id != null ? (logos.bgById.get(r.school_id) ?? null) : null,
    }))

    const schoolCounts = new Map<number, { name: string; count: number }>()
    for (const p of ((placementsRes.data ?? []) as { school_name: string | null; school_id: number | null }[])) {
      if (p.school_id == null || !p.school_name) continue
      const c = schoolCounts.get(p.school_id) ?? { name: p.school_name, count: 0 }
      c.count++
      schoolCounts.set(p.school_id, c)
    }
    podiumSchools = [...schoolCounts.entries()]
      .map(([school_id, { name, count }]) => ({ school_id, school_name: name, count, logo_url: logos.byId.get(school_id) ?? null, bg_color: logos.bgById.get(school_id) ?? null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">


{/* ── Leaderboards ── */}
      {showLeaderboards && (
        <div className="space-y-10 border-t border-slate-200 pt-10 mb-10">

          {stateChampions.length > 0 && (
            <StateChampions rows={stateChampions} seasonYear={seasonEndYear} />
          )}

          {podiumSchools.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-rose-900 mb-3">On the Podium</h2>
              <p className="text-xs text-slate-500 mb-3">Schools ranked by total wrestlers finishing 1st–8th at States</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {podiumSchools.map(s => (
                  <div
                    key={s.school_id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-none border border-black bg-white shadow-none"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <SchoolLogoBadge logoUrl={s.logo_url} bgColor={s.bg_color} />
                      <span className="text-sm font-medium text-slate-800 truncate">{s.school_name}</span>
                    </span>
                    <span className="text-xs font-semibold text-amber-600 ml-2 shrink-0">{s.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {topTeamScores.length > 0 && (
            <PostseasonLeaders rows={topTeamScores} schoolBase="/schools" accentColor="rose" gender="girls" />
          )}

        </div>
      )}

      {/* ── Tournament buttons: the standard buttons, as on the Individual Post Season page (Kyle 2026-11-16) ── */}
      <div className="border-t border-slate-200 pt-10">
        <TournamentButtons side="girls" state regions={rl.order.length ? rl.order : Array.from({ length: 4 }, (_, i) => i + 1)}
          districts={Array.from({ length: 12 }, (_, i) => i + 1)} regionNames={Object.fromEntries(Array.from({ length: 4 }, (_, i) => [i + 1, rl.button(i + 1)]))} />
      </div>
    </div>
  )
}
