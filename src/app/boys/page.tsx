import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { StateContent } from '@/components/StateContent'

type WrestlerRow = { id: string; first_name: string; last_name: string }
type SchoolRow   = { school: string; school_name: string; total_points: number; wrestler_count: number }

export default async function BoysSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sq?: string }>
}) {
  const { q: rawQ, sq: rawSq } = await searchParams
  const q  = rawQ?.trim()  ?? ''
  const sq = rawSq?.trim() ?? ''

  const [wrestlerRes, schoolDirRes] = await Promise.all([
    q.length >= 2
      ? supabase.from('wrestlers').select('id, first_name, last_name')
          .eq('gender', 'M')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .order('last_name').order('first_name').limit(30)
      : Promise.resolve({ data: null }),
    sq.length >= 2
      ? supabase.rpc('school_directory', { p_gender: 'M' })
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">

      {/* ── Search bars ── */}
      <div className="max-w-2xl mb-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Boys Search</h1>

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

      {/* ── State Championships ── */}
      <div className="border-t border-slate-200 pt-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">State Championships</h2>
          <p className="text-slate-500 text-sm mt-1">NJSIAA 2024–25 · Atlantic City · 32-man double elimination</p>
        </div>
        <StateContent gender="M" />
      </div>

    </div>
  )
}
