import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { PageHeader } from '@/components/PageHeader'
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getAllGroups } from '@/lib/sections'

type SchoolDirRow = {
  school: string
  school_name: string
  school_id: number | null
  total_points: number
  wrestler_count: number
}

const CONFERENCES = getAllConferences()
const SECTIONS    = getAllSections()
const GROUPS      = getAllGroups()

const SELECT_CLS = `border border-slate-300 rounded-none px-3 py-2.5 text-sm bg-white
  focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700`

export default async function BoysSchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; conf?: string; group?: string; section?: string }>
}) {
  const { q: raw, conf, group, section } = await searchParams
  const q = raw?.trim().toLowerCase() ?? ''

  const season = await getActiveSeason()

  const [{ data }, logos, { data: schoolData }] = await Promise.all([
    supabase.rpc('school_directory', { p_gender: 'M', p_season: season }),
    getSchoolLogos(),
    supabase
      .from('schools')
      .select('id, athletic_conference, classification, section')
      .eq('is_nj', true),
  ])

  // Build school metadata map for filtering
  const meta = new Map<number, { conf: string | null; group: string | null; section: string | null }>()
  for (const s of (schoolData ?? []) as { id: number; athletic_conference: string | null; classification: string | null; section: string | null }[]) {
    meta.set(s.id, { conf: s.athletic_conference, group: s.classification, section: s.section })
  }

  const all = ((data ?? []) as SchoolDirRow[]).map(r => ({
    ...r,
    logo_url: r.school_id ? logos.byId.get(r.school_id) ?? null : logos.byName.get(r.school_name) ?? null,
    bg_color: r.school_id ? logos.bgById.get(r.school_id) ?? null : logos.bgByName.get(r.school_name) ?? null,
  }))

  const isFiltered = !!(q || conf || group || section)

  const rows = all.filter(r => {
    if (q && !r.school_name.toLowerCase().includes(q) && !r.school.toLowerCase().includes(q)) return false
    if (conf || group || section) {
      if (!r.school_id) return false
      const m = meta.get(r.school_id)
      if (!m) return false
      if (conf    && m.conf    !== conf)    return false
      if (group   && m.group   !== group)   return false
      if (section && m.section !== section) return false
    }
    return true
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/boys"
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        ← Boys Search
      </Link>

      <div className="mb-6 text-center">
        <PageHeader title="Boys School Directory" />
        <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
          <span>{all.length} schools · NJSIAA</span>
          <InlineSeasonPicker activeSeason={season} />
          <span>boys postseason</span>
        </div>
      </div>

      <form method="GET" className="mb-6 space-y-2">
        {/* Search row */}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={raw ?? ''}
            placeholder="Search by school name…"
            autoComplete="off"
            className="flex-1 border border-slate-300 rounded-none px-4 py-2.5 text-base
                       shadow-none focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <button
            type="submit"
            className="bg-slate-800 text-white px-5 py-2.5 rounded-none font-medium
                       hover:bg-slate-700 transition-colors"
          >
            Filter
          </button>
          {isFiltered && (
            <Link
              href="/boys/schools"
              className="px-4 py-2.5 rounded-none border border-slate-300 text-slate-600
                         hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>

        {/* Filter selects row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select name="conf" defaultValue={conf ?? ''} className={`flex-1 ${SELECT_CLS}`}>
            <option value="">All Conferences</option>
            {CONFERENCES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select name="group" defaultValue={group ?? ''} className={`sm:w-40 ${SELECT_CLS}`}>
            <option value="">All Groups</option>
            {GROUPS.map(g => (
              <option key={g.name} value={g.name}>{g.label}</option>
            ))}
          </select>
          <select name="section" defaultValue={section ?? ''} className={`sm:w-44 ${SELECT_CLS}`}>
            <option value="">All Sections</option>
            {SECTIONS.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-slate-500 text-sm">No schools match the current filters.</p>
      ) : (
        <div className="border border-black rounded-none overflow-x-auto shadow-none bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">
                  School {isFiltered && rows.length !== all.length && (
                    <span className="font-normal text-slate-400">({rows.length} of {all.length})</span>
                  )}
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Points</th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">Wrestlers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.school} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <SchoolLogoBadge logoUrl={r.logo_url} bgColor={r.bg_color} />
                      {r.school_id ? (
                        <Link
                          href={`/boys/schools/${r.school_id}`}
                          className="font-medium text-slate-800 hover:text-slate-600 hover:underline"
                        >
                          {r.school_name}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-800">{r.school_name}</span>
                      )}
                    </div>
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
