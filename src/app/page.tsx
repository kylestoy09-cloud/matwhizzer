import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'

type WrestlerRow = { id: string; first_name: string; last_name: string; gender: string }
type SchoolRow   = { school: string; school_name: string; total_points: number; wrestler_count: number }
type SchoolResult = SchoolRow & { gender: 'M' | 'F' }

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

  const wrestlers = (wrestlerRes.data ?? []) as WrestlerRow[]

  let schools: SchoolResult[] = []
  if (sq.length >= 2) {
    const ql = sq.toLowerCase()
    const boysList = ((boysSchoolRes.data ?? []) as SchoolRow[])
      .filter(s => s.school_name?.toLowerCase().includes(ql) || s.school?.toLowerCase().includes(ql))
      .map(s => ({ ...s, gender: 'M' as const }))
    const boysAbbrs = new Set(boysList.map(s => s.school))
    const girlsList = ((girlsSchoolRes.data ?? []) as SchoolRow[])
      .filter(s => s.school_name?.toLowerCase().includes(ql) || s.school?.toLowerCase().includes(ql))
      .filter(s => !boysAbbrs.has(s.school))   // deduplicate by abbreviation
      .map(s => ({ ...s, gender: 'F' as const }))
    schools = [...boysList, ...girlsList].slice(0, 15)
  }

  const boysDistricts  = Array.from({ length: 32 }, (_, i) => i + 1)
  const girlsDistricts = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── Search bars ── */}
      <div className="max-w-2xl mb-12">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">NJSIAA Wrestling</h1>

        {/* Wrestler search */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Wrestler</h2>
          <form method="GET">
            {sq && <input type="hidden" name="sq" value={sq} />}
            <div className="flex gap-2">
              <input
                type="text" name="q" defaultValue={q}
                placeholder="Search by first or last name…"
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
            <p className="text-slate-500 text-sm mt-2">No wrestlers found for <strong>&ldquo;{q}&rdquo;</strong>.</p>
          )}
          {wrestlers.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
              {wrestlers.map(w => (
                <li key={w.id}>
                  <Link href={`/wrestler/${w.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800">{w.first_name} {w.last_name}</span>
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
                placeholder="Search by school name…"
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
                <li key={`${s.gender}-${s.school}`}>
                  <Link
                    href={`/${s.gender === 'M' ? 'boys' : 'girls'}/schools/${encodeURIComponent(s.school)}`}
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

      {/* ── District grids ── */}
      <div className="space-y-10 border-t border-slate-200 pt-10">

        {/* Boys Districts */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-900">Boys Districts</h2>
            <p className="text-slate-500 text-sm mt-0.5">NJSIAA 2025–26 · Select a district</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {boysDistricts.map(d => (
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

        {/* Girls Districts */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-rose-900">Girls Districts</h2>
            <p className="text-slate-500 text-sm mt-0.5">NJSIAA 2025–26 · Select a district</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {girlsDistricts.map(d => (
              <Link
                key={d}
                href={`/girls/districts/${d}`}
                className="flex flex-col items-center justify-center aspect-square rounded-lg border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-sm"
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
