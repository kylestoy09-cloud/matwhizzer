import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getAllConferences, conferenceToSlug } from '@/lib/conferences'
import { sectionToSlug, groupToSlug } from '@/lib/sections'

const SECTIONS = ['North I', 'North II', 'Central', 'South'] as const
const PUBLIC_GROUPS = ['1', '2', '3', '4', '5'] as const
const NP_GROUPS = ['A', 'B'] as const

export async function StandingsContent({ gender }: { gender: 'boys' | 'girls' }) {
  const { data: confRows } = await supabase.from('conferences').select('slug, logo_url')
  const logoMap = new Map<string, string>()
  for (const c of confRows ?? []) if (c.logo_url) logoMap.set(c.slug, c.logo_url)

  const conferences = getAllConferences().map(c => ({
    ...c,
    logoUrl: logoMap.get(c.slug) ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

      {/* ── By Group ─────────────────────────────────────────────── */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900">By Group</h2>
          <p className="text-sm text-slate-500 mt-1">NJSIAA team tournament classification groups</p>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="text-left px-4 py-2.5 font-semibold w-28">Section</th>
                {PUBLIC_GROUPS.map(g => (
                  <th key={g} className="text-center px-4 py-2.5 font-semibold">Group {g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section, i) => (
                <tr key={section} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-2.5 font-semibold text-slate-700 border-r border-slate-200">{section}</td>
                  {PUBLIC_GROUPS.map(g => (
                    <td key={g} className="text-center px-4 py-2.5">
                      <Link
                        href={`/sections/${sectionToSlug(section)}/${groupToSlug(g)}?gender=${gender}`}
                        className="inline-block px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition-colors"
                      >
                        {section} G{g}
                      </Link>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-4">
          {NP_GROUPS.map(g => (
            <Link
              key={g}
              href={`/sections/${sectionToSlug('Non-Public')}/${groupToSlug(g)}?gender=${gender}`}
              className="flex-1 flex items-center justify-center py-3 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100 font-semibold text-slate-800 transition-colors"
            >
              Non-Public Group {g}
            </Link>
          ))}
        </div>
      </section>

      {/* ── By Conference ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">By Conference</h2>
        <p className="text-sm text-slate-500 mb-6">NJ high school wrestling conferences</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {conferences.map(c => (
            <Link
              key={c.slug}
              href={`/conferences/${c.slug}?gender=${gender}`}
              className="block bg-white border border-black rounded-lg hover:border-slate-400 transition-colors overflow-hidden"
            >
              {c.logoUrl ? (
                <Image src={c.logoUrl} alt={c.name} width={1079} height={647} className="w-full h-auto" />
              ) : (
                <div
                  className="w-full aspect-[1079/647] flex items-center justify-center font-bold text-4xl"
                  style={{ backgroundColor: '#1a1a2e', color: '#FFD700' }}
                >
                  {c.name[0]}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
