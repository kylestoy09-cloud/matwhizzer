import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'

type SchoolDirRow = {
  school: string
  school_name: string
  total_points: number
  wrestler_count: number
}

export default async function GirlsSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q: raw } = await searchParams
  const q = raw?.trim().toLowerCase() ?? ''

  const season = await getActiveSeason()

  const { data } = await supabase.rpc('school_directory', { p_gender: 'F', p_season: season })
  const all = (data ?? []) as SchoolDirRow[]

  const rows = q
    ? all.filter(r =>
        r.school_name.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q)
      )
    : all

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/girls"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Girls Search
      </Link>

      <div className="mb-6 text-center">
        <PageHeader title="Girls School Directory" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>{all.length} schools · NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>girls postseason</span>
        </div>
      </div>

      <form method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={raw ?? ''}
            placeholder="Search by school name…"
            autoComplete="off"
            className="flex-1 border border-slate-300 rounded-none px-4 py-2.5 text-base
                       shadow-none focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            type="submit"
            className="bg-rose-800 text-white px-5 py-2.5 rounded-none font-medium
                       hover:bg-rose-700 transition-colors"
          >
            Filter
          </button>
          {q && (
            <Link
              href="/girls/schools"
              className="px-4 py-2.5 rounded-none border border-slate-300 text-slate-600
                         hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No schools match &ldquo;{raw}&rdquo;.</p>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">School</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Points</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Wrestlers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.school} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/schools/${encodeURIComponent(r.school)}`}
                      className="font-medium text-slate-800 hover:text-rose-700 hover:underline"
                    >
                      {r.school_name}
                    </Link>
                    <span className="ml-2 text-slate-400 text-xs">{r.school}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {r.total_points > 0 ? r.total_points : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                    {r.wrestler_count}
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
