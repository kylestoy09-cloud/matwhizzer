export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getActiveSeason } from '@/lib/get-season'
import { SEASONS } from '@/lib/seasons'
import { PostseasonLeaders } from '@/components/PostseasonLeaders'
import { PageHeader } from '@/components/PageHeader'
import { PersonalizedHome } from '@/components/PersonalizedHome'

type ChampionRow = { weight: number; wrestler_id: string; wrestler_name: string; school: string; dominance_score: number; seed: number | null }

type WrestlerRow = { id: string; first_name: string; last_name: string; gender: string }
type SchoolRow   = { school: string; school_name: string; school_id: number | null; total_points: number; wrestler_count: number }
type SchoolResult = SchoolRow & { gender: 'M' | 'F' }
type TeamScoreRow = { school: string; school_name: string | null; school_id: number | null; district_points: number; region_points: number; state_points: number; total_points: number }
type DominanceRow = { wrestler_id: string; name: string; school: string | null; dominance_score: number; win_count: number }

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sq?: string }>
}) {
  const { q: rawQ, sq: rawSq } = await searchParams
  const q  = rawQ?.trim()  ?? ''
  const sq = rawSq?.trim() ?? ''
  const season = await getActiveSeason()

  const [wrestlerRes, boysSchoolRes, girlsSchoolRes] = await Promise.all([
    q.length >= 2
      ? supabase.from('wrestlers').select('id, first_name, last_name, gender')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .order('last_name').order('first_name').limit(30)
      : Promise.resolve({ data: null }),
    sq.length >= 2
      ? supabase.rpc('school_directory', { p_gender: 'M', p_season: season })
      : Promise.resolve({ data: null }),
    sq.length >= 2
      ? supabase.rpc('school_directory', { p_gender: 'F', p_season: season })
      : Promise.resolve({ data: null }),
  ])

  const rawWrestlers = (wrestlerRes.data ?? []) as WrestlerRow[]

  // Fetch grades for search results
  const gradeMap: Record<string, string> = {}
  if (rawWrestlers.length > 0) {
    const { data: gradeRows } = await supabase
      .from('tournament_entries')
      .select('wrestler_id, grade_label, tournament:tournaments(season_id)')
      .in('wrestler_id', rawWrestlers.map(w => w.id))
      .not('grade_label', 'is', null)
      .order('tournament_id', { ascending: false })
    for (const gr of (gradeRows ?? []) as { wrestler_id: string; grade_label: string }[]) {
      if (!gradeMap[gr.wrestler_id]) gradeMap[gr.wrestler_id] = gr.grade_label
    }
  }
  const wrestlers = rawWrestlers

  let schools: SchoolResult[] = []
  if (sq.length >= 2) {
    const ql = sq.toLowerCase()
    const boysList = ((boysSchoolRes.data ?? []) as SchoolRow[])
      .filter(s => s.school_name?.toLowerCase().includes(ql) || s.school?.toLowerCase().includes(ql))
      .map(s => ({ ...s, gender: 'M' as const }))
    const boysAbbrs = new Set(boysList.map(s => s.school))
    const girlsList = ((girlsSchoolRes.data ?? []) as SchoolRow[])
      .filter(s => s.school_name?.toLowerCase().includes(ql) || s.school?.toLowerCase().includes(ql))
      .filter(s => !boysAbbrs.has(s.school))
      .map(s => ({ ...s, gender: 'F' as const }))
    schools = [...boysList, ...girlsList].slice(0, 15)
  }

  // Fetch leaderboard data for the home page (only when not searching)
  const showLeaderboards = q.length < 2 && sq.length < 2

  let topTeamScores: TeamScoreRow[] = []
  let topDominance: DominanceRow[] = []
  let boysPodium: { school_name: string; count: number }[] = []
  let girlsPodium: { school_name: string; count: number }[] = []
  let boysChampions: ChampionRow[] = []
  let girlsChampions: ChampionRow[] = []

  if (showLeaderboards) {
    const [dominanceRes, teamScoreRes, boysPlacementsRes, girlsPlacementsRes, boysChampRes, girlsChampRes] = await Promise.all([
      supabase.rpc('lb_dominance', { p_gender: 'M', p_season: season }),
      supabase.rpc('top_postseason_team_scores', { p_gender: 'M', p_season: season, p_limit: 25 }),
      supabase.rpc('state_placements', { p_gender: 'M', p_season: season }),
      supabase.rpc('state_placements', { p_gender: 'F', p_season: season }),
      supabase.rpc('state_champions', { p_tournament_id: season === 2 ? 180 : 133 }),
      supabase.rpc('state_champions', { p_tournament_id: season === 2 ? 185 : null }),
    ])
    topDominance = (dominanceRes.data ?? []).slice(0, 8) as DominanceRow[]
    topTeamScores = (teamScoreRes.data ?? []) as TeamScoreRow[]
    boysChampions = (boysChampRes.data ?? []) as ChampionRow[]
    girlsChampions = (girlsChampRes.data ?? []) as ChampionRow[]

    function buildPodium(placements: { school_name: string; school: string }[]) {
      const counts = new Map<string, number>()
      for (const p of placements) {
        const name = p.school_name || p.school || ''
        if (!name) continue
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      return [...counts.entries()]
        .map(([school_name, count]) => ({ school_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }

    boysPodium = buildPodium((boysPlacementsRes.data ?? []) as { school_name: string; school: string }[])
    girlsPodium = buildPodium((girlsPlacementsRes.data ?? []) as { school_name: string; school: string }[])
  }

  const boysDistricts  = Array.from({ length: 32 }, (_, i) => i + 1)
  const girlsDistricts = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── Logo + Search bars ── */}
      <div className="mb-12 flex flex-col md:flex-row md:items-start md:gap-8">
        {/* Mobile: logo above search */}
        <div className="flex justify-center mb-6 md:hidden">
          <Image
            src="/mwl-word.png"
            alt="Mat Whizzer"
            width={400}
            height={172}
            className="w-3/4 h-auto"
            priority
          />
        </div>

      <div className="max-w-2xl flex-1">
        <div className="mb-8">
          <PageHeader title="NJSIAA Wrestling" showLogo={false} />
        </div>

        {/* Wrestler search */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Wrestler</h2>
          <form method="GET">
            {sq && <input type="hidden" name="sq" value={sq} />}
            <div className="flex gap-2">
              <input
                type="text" name="q" defaultValue={q}
                placeholder="Search by first or last name..."
                autoComplete="off"
                className="flex-1 border border-slate-300 rounded-none px-4 py-2.5 text-base shadow-none focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button type="submit" className="bg-slate-800 text-white px-5 py-2.5 rounded-none font-medium hover:bg-slate-700 transition-colors">
                Search
              </button>
            </div>
          </form>
          {q.length > 0 && q.length < 2 && <p className="text-slate-500 text-sm mt-2">Enter at least 2 characters.</p>}
          {q.length >= 2 && wrestlers.length === 0 && (
            <p className="text-slate-500 text-sm mt-2">No wrestlers found for <strong>&ldquo;{q}&rdquo;</strong>.</p>
          )}
          {wrestlers.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-200 border border-black rounded-none overflow-hidden shadow-none bg-white">
              {wrestlers.map(w => (
                <li key={w.id}>
                  <Link href={`/wrestler/${w.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800">{w.first_name} {w.last_name}{gradeMap[w.id] ? `, ${gradeMap[w.id]}` : ''}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 shrink-0 ${
                      w.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {w.gender === 'F' ? 'Girls' : 'Boys'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* School search */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">School</h2>
          <form method="GET">
            {q && <input type="hidden" name="q" value={q} />}
            <div className="flex gap-2">
              <input
                type="text" name="sq" defaultValue={sq}
                placeholder="Search by school name..."
                autoComplete="off"
                className="flex-1 border border-slate-300 rounded-none px-4 py-2.5 text-base shadow-none focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <button type="submit" className="bg-slate-800 text-white px-5 py-2.5 rounded-none font-medium hover:bg-slate-700 transition-colors">
                Search
              </button>
            </div>
          </form>
          {sq.length > 0 && sq.length < 2 && <p className="text-slate-500 text-sm mt-2">Enter at least 2 characters.</p>}
          {sq.length >= 2 && schools.length === 0 && (
            <p className="text-slate-500 text-sm mt-2">No schools found for <strong>&ldquo;{sq}&rdquo;</strong>.</p>
          )}
          {schools.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-200 border border-black rounded-none overflow-hidden shadow-none bg-white">
              {schools.map(s => (
                <li key={`${s.gender}-${s.school}`}>
                  <Link
                    href={s.school_id ? `/schools/${s.school_id}?gender=${s.gender === 'M' ? 'boys' : 'girls'}` : '#'}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-800">{s.school_name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-3 shrink-0 ${
                      s.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.gender === 'F' ? 'Girls' : 'Boys'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

        {/* Desktop: logo to the right of search */}
        <div className="hidden md:flex md:items-center md:justify-center md:pt-8">
          <Image
            src="/mwl-word.png"
            alt="Mat Whizzer"
            width={360}
            height={155}
            className="h-48 w-auto"
            priority
          />
        </div>
      </div>

      {/* ── Personalized content (logged-in users) ── */}
      {showLeaderboards && <PersonalizedHome />}

      {/* ── Leaderboards (shown when not searching) ── */}
      {showLeaderboards && (
        <div className="space-y-10 border-t border-slate-200 pt-10 mb-10">

          {/* State Champions — boys and girls side by side */}
          {(boysChampions.length > 0 || girlsChampions.length > 0) && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">{season === 2 ? '2026' : '2025'} State Champions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boysChampions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Boys</h3>
                    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden divide-y divide-slate-100">
                      {boysChampions.map(c => (
                        <div key={c.weight} className="flex items-center gap-2 px-3 py-2">
                          <span className="text-xs text-slate-400 w-8 shrink-0 text-right">{c.weight}</span>
                          <Link href={`/wrestler/${c.wrestler_id}`} className="text-sm font-medium text-slate-800 hover:underline truncate">
                            {c.wrestler_name}
                          </Link>
                          {c.seed != null && c.seed >= 5 && <span className="shrink-0" title={`#${c.seed} seed — Ghost Champion`}>👻</span>}
                          <span className="text-[11px] text-slate-400 shrink-0 ml-auto truncate max-w-[100px]">{c.school}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {girlsChampions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Girls</h3>
                    <div className="bg-white rounded-none border border-black shadow-none overflow-hidden divide-y divide-slate-100">
                      {girlsChampions.map(c => (
                        <div key={c.weight} className="flex items-center gap-2 px-3 py-2">
                          <span className="text-xs text-slate-400 w-8 shrink-0 text-right">{c.weight}</span>
                          <Link href={`/wrestler/${c.wrestler_id}`} className="text-sm font-medium text-slate-800 hover:underline truncate">
                            {c.wrestler_name}
                          </Link>
                          {c.seed != null && c.seed >= 5 && <span className="shrink-0" title={`#${c.seed} seed — Ghost Champion`}>👻</span>}
                          <span className="text-[11px] text-slate-400 shrink-0 ml-auto truncate max-w-[100px]">{c.school}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* On the Podium — boys and girls side by side */}
          {(boysPodium.length > 0 || girlsPodium.length > 0) && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">On the Podium</h2>
              <p className="text-xs text-slate-500 mb-3">Schools ranked by wrestlers finishing 1st–8th at States</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boysPodium.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Boys</h3>
                    <div className="space-y-1.5">
                      {boysPodium.map(s => (
                        <div
                          key={s.school_name}
                          className="flex items-center justify-between px-3 py-2 rounded-none border border-black bg-white shadow-none"
                        >
                          <span className="text-sm font-medium text-slate-800 truncate">{s.school_name}</span>
                          <span className="text-xs font-semibold text-amber-600 ml-2 shrink-0">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {girlsPodium.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Girls</h3>
                    <div className="space-y-1.5">
                      {girlsPodium.map(s => (
                        <div
                          key={s.school_name}
                          className="flex items-center justify-between px-3 py-2 rounded-none border border-black bg-white shadow-none"
                        >
                          <span className="text-sm font-medium text-slate-800 truncate">{s.school_name}</span>
                          <span className="text-xs font-semibold text-rose-500 ml-2 shrink-0">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {topTeamScores.length > 0 && (
            <PostseasonLeaders rows={topTeamScores} schoolBase="/schools" />
          )}

          {/* Top 8 Dominance */}
          {topDominance.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Hammer Rating</h2>
              <p className="text-slate-500 text-sm mb-4">Avg dominance per match: pins/TFs graded by speed (max 9), MD=2, Dec=1, losses scored inverse</p>
              <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {topDominance.map((r, i) => (
                    <div key={r.wrestler_id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="text-xs text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/wrestler/${r.wrestler_id}`}
                          className="text-sm font-medium text-slate-800 hover:underline truncate block"
                        >
                          {r.name}
                        </Link>
                        <div className="text-[11px] text-slate-400 truncate">{r.school || '—'} · {r.win_count} wins</div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">{r.dominance_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Tournament grids ── */}
      <div className="space-y-10 border-t border-slate-200 pt-10">

        {/* State Tournament buttons */}
        <section className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/boys/state"
            className="flex items-center justify-center gap-2 flex-1 py-4 rounded-none bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg transition-colors shadow-none"
          >
            Boys State Tournament
            <span className="text-white/70">→</span>
          </Link>
          <Link
            href="/girls/state"
            className="flex items-center justify-center gap-2 flex-1 py-4 rounded-none bg-rose-600 hover:bg-rose-700 text-white font-bold text-lg transition-colors shadow-none"
          >
            Girls State Tournament
            <span className="text-white/70">→</span>
          </Link>
        </section>

        {/* Boys Regions */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Boys Regions</h2>
            <p className="text-slate-500 text-sm mt-0.5">NJSIAA {SEASONS[season]?.label ?? season} · Select a region</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(r => (
              <Link
                key={r}
                href={`/boys/regions/${r}`}
                className="flex flex-col items-center justify-center aspect-square rounded-none border border-black bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-colors shadow-none"
              >
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Reg.</span>
                <span className="text-xl font-bold text-slate-800">{r}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Girls Regions */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-rose-900">Girls Regions</h2>
            <p className="text-slate-500 text-sm mt-0.5">NJSIAA {SEASONS[season]?.label ?? season} · Select a region</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => i + 1).map(r => (
              <Link
                key={r}
                href={`/girls/regions/${r}`}
                className="flex flex-col items-center justify-center py-4 rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-none"
              >
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Reg.</span>
                <span className="text-xl font-bold text-slate-800">{r}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Boys Districts */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Boys Districts</h2>
            <p className="text-slate-500 text-sm mt-0.5">Select a district</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {boysDistricts.map(d => (
              <Link
                key={d}
                href={`/boys/districts/${d}`}
                className="flex flex-col items-center justify-center aspect-square rounded-none border border-black bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-none"
              >
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Dist.</span>
                <span className="text-xl font-bold text-slate-800">{d}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Girls Districts */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-rose-900">Girls Districts</h2>
            <p className="text-slate-500 text-sm mt-0.5">Select a district</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {girlsDistricts.map(d => (
              <Link
                key={d}
                href={`/girls/districts/${d}`}
                className="flex flex-col items-center justify-center aspect-square rounded-none border border-black bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-none"
              >
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Dist.</span>
                <span className="text-xl font-bold text-slate-800">{d}</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
