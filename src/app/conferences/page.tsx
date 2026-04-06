import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { getAllConferences, conferenceToSlug } from '@/lib/conferences'

export const dynamic = 'force-dynamic'

export default async function ConferencesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>
}) {
  const { gender: genderParam } = await searchParams
  const gender = genderParam === 'girls' ? 'girls' : 'boys'

  // Count schools per conference
  const { data: schools } = await supabase
    .from('schools')
    .select('athletic_conference')
    .not('athletic_conference', 'is', null)
    .eq('is_combined', false)

  const counts = new Map<string, number>()
  for (const s of (schools ?? [])) {
    const conf = s.athletic_conference as string
    counts.set(conf, (counts.get(conf) ?? 0) + 1)
  }

  // Fetch logo_urls from conferences table
  const { data: confRows } = await supabase
    .from('conferences')
    .select('slug, logo_url')

  const logoMap = new Map<string, string>()
  for (const c of (confRows ?? [])) {
    if (c.logo_url) logoMap.set(c.slug, c.logo_url)
  }

  const conferences = getAllConferences().map(c => ({
    ...c,
    schoolCount: counts.get(c.name) ?? 0,
    logoUrl: logoMap.get(c.slug) ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Conferences</h1>
      <p className="text-sm text-slate-500 mb-6">NJ high school wrestling conferences</p>

      {/* Gender toggle */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex rounded-none border border-slate-200 overflow-hidden text-sm">
          <Link
            href="/conferences?gender=boys"
            className={`px-4 py-2 font-medium transition-colors ${gender === 'boys' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Boys
          </Link>
          <Link
            href="/conferences?gender=girls"
            className={`px-4 py-2 font-medium transition-colors ${gender === 'girls' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Girls
          </Link>
        </div>
      </div>

      {/* Conference logo cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {conferences.map(c => (
          <Link
            key={c.slug}
            href={`/conferences/${c.slug}?gender=${gender}`}
            className="block bg-white border border-black rounded-none shadow-none hover:border-slate-400 transition-colors overflow-hidden"
          >
            {/* Logo — exact WrestlerAvatar lg pattern */}
            <div className="w-full">
              {c.logoUrl ? (
                <Image
                  src={c.logoUrl}
                  alt={c.name}
                  width={1079}
                  height={647}
                  className="w-full h-auto"
                />
              ) : (
                <div
                  className="w-full aspect-[1079/647] flex items-center justify-center font-bold text-4xl"
                  style={{ backgroundColor: '#1a1a2e', color: '#FFD700' }}
                >
                  {c.name[0]}
                </div>
              )}
            </div>

          </Link>
        ))}
      </div>
    </div>
  )
}
