import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getActiveSeason } from '@/lib/get-season'
import { PostseasonLeaders } from '@/components/PostseasonLeaders'

type WrestlerRow = { id: string; first_name: string; last_name: string }
type SchoolRow   = { school: string; school_name: string; total_points: number; wrestler_count: number }
type TeamScoreRow = { school: string; school_name: string | null; district_points: number; region_points: number; state_points: number; total_points: number }
type DominanceRow = { wrestler_id: string; name: string; school: string | null; dominance_score: number; win_count: number }

export default async function BoysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sq?: string }>
}) {
  const { q: rawQ, sq: rawSq } = await searchParams
  const q  = rawQ?.trim()  ?? ''
  const sq = rawSq?.trim() ?? ''
  const season = await getActiveSeason()

  const [wrestlerRes, schoolDirRes] = await Promise.all([
    q.length >= 2
      ? supabase.from('wrestlers').select('id, first_name, last_name')
          .eq('gender', 'M')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .order('last_name').order('first_name').limit(30)
      : Promise.resolve({ data: null }),
    sq.length >= 2
      ? supabase.rpc('school_directory', { p_gender: 'M', p_season: season })
      : Promise.resolve({ data: null }),
  ])

  const wrestlers = (wrestlerRes.data ?? []) as WrestlerRow[]

  let schools: SchoolRow[] = []
  if (sq.length >= 2 && schoolDirRes.data) {
    const ql = sq.toLowerCase()
    schools = (schoolDirRes.data as SchoolRow[])
      .filter(s => s.school_name?.toLowerCase().includes(ql) || s.school?.toLowerCase().includes(ql))
      .slice(0, 15)
  }

  const showLeaderboards = q.length < 2 && sq.length < 2

  let topTeamScores: TeamScoreRow[] = []
  let topDominance: DominanceRow[] = []
  let topSchoolsByWrestlers: { school: string; school_name: string | null; wrestler_count: number }[] = []

  if (showLeaderboards) {
    const [dominanceRes, teamScoreRes, activeSchoolsRes] = await Promise.all([
      supabase.rpc('lb_dominance', { p_gender: 'M', p_season: season }),
      supabase.rpc('top_postseason_team_scores', { p_gender: 'M', p_season: season, p_limit: 25 }),
      supabase.rpc('top_active_schools', { p_gender: 'M', p_season: season, p_limit: 20 }),
    ])
    topDominance = (dominanceRes.data ?? []).slice(0, 8) as DominanceRow[]
    topTeamScores = (teamScoreRes.data ?? []) as TeamScoreRow[]
    topSchoolsByWrestlers = (activeSchoolsRes.data ?? []) as { school: string; school_name: string | null; wrestler_count: number }[]
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── Logo + Search bars ── */}
      <div className="mb-10 flex flex-col md:flex-row md:items-start md:gap-8">
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
          <h1 className="text-2xl font-bold text-slate-800 mb-8">Boys Wrestling</h1>

          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Wrestler</h2>
            <form method="GET">
              {sq && <input type="hidden" name="sq" value={sq} />}
              <div className="flex gap-2">
                <input
                  type="text" name="q" defaultValue={q}
                  placeholder="Search by first or last name..."
                  autoComplete="off"
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <button type="submit" className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-700 transition-colors">
                  Search
                </button>
              </div>
            </form>
            {q.length > 0 && q.length < 2 && <p className="text-slate-500 text-sm mt-2">Enter at least 2 characters.</p>}
            {q.length >= 2 && wrestlers.length === 0 && (
              <p className="text-slate-500 text-sm mt-2">No boys wrestlers found for <strong>&ldquo;{q}&rdquo;</strong>.</p>
            )}
            {wrestlers.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                {wrestlers.map(w => (
                  <li key={w.id}>
                    <Link href={`/wrestler/${w.id}`} className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                      <span className="font-medium text-slate-800">{w.first_name} {w.last_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">School</h2>
            <form method="GET">
              {q && <input type="hidden" name="q" value={q} />}
              <div className="flex gap-2">
                <input
                  type="text" name="sq" defaultValue={sq}
                  placeholder="Search by school name..."
                  autoComplete="off"
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <button type="submit" className="bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-700 transition-colors">
                  Search
                </button>
              </div>
            </form>
            {sq.length > 0 && sq.length < 2 && <p className="text-slate-500 text-sm mt-2">Enter at least 2 characters.</p>}
            {sq.length >= 2 && schools.length === 0 && (
              <p className="text-slate-500 text-sm mt-2">No schools found for <strong>&ldquo;{sq}&rdquo;</strong>.</p>
            )}
            {schools.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
                {schools.map(s => (
                  <li key={s.school}>
                    <Link href={`/boys/schools/${encodeURIComponent(s.school)}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                      <span className="font-medium text-slate-800">{s.school_name}</span>
                      <span className="text-xs text-slate-400 ml-3 shrink-0">{s.school}</span>
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

      {/* ── Leaderboards ── */}
      {showLeaderboards && (
        <div className="space-y-10 border-t border-slate-200 pt-10 mb-10">

          {topSchoolsByWrestlers.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Still in the Room</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {topSchoolsByWrestlers.map(s => (
                  <Link
                    key={s.school}
                    href={`/boys/schools/${encodeURIComponent(s.school)}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
                  >
                    <span className="text-sm font-medium text-slate-800 truncate">{s.school_name || s.school}</span>
                    <span className="text-xs text-slate-400 ml-2 shrink-0">{s.wrestler_count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {topTeamScores.length > 0 && (
            <PostseasonLeaders rows={topTeamScores} schoolBase="/boys/schools" />
          )}

          {topDominance.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Hammer Rating</h2>
              <p className="text-slate-500 text-sm mb-4">Avg score per match · wins score high, losses penalized · FORF/INJ/DQ excluded · min 3 wins</p>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <div className="text-[11px] text-slate-400 truncate">{r.school || '\u2014'} · {r.win_count} wins</div>
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

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Regions</h2>
            <p className="text-slate-500 text-sm mt-0.5">Select a region</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(r => (
              <Link
                key={r}
                href={`/boys/regions/${r}`}
                className="flex flex-col items-center justify-center aspect-square rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-colors shadow-sm"
              >
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Reg.</span>
                <span className="text-xl font-bold text-slate-800">{r}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Districts</h2>
            <p className="text-slate-500 text-sm mt-0.5">Select a district</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 32 }, (_, i) => i + 1).map(d => (
              <Link
                key={d}
                href={`/boys/districts/${d}`}
                className="flex flex-col items-center justify-center aspect-square rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
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
