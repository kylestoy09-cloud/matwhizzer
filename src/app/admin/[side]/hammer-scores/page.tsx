import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HammerScoresGenderSwitch } from './HammerScoresGenderSwitch'
import { RATING_NAME, RATING_SHORT } from '@/lib/rating'
import { getRatingBlurb } from '@/lib/rating-server'
import { RatingBlurbEditor } from './RatingBlurbEditor'

// Where the rating's name is defined — every page and tool reads it from this one file.
const RATING_SOURCE_URL = 'https://github.com/kylestoy09-cloud/matwhizzer/blob/main/src/lib/rating.ts'

export const dynamic = 'force-dynamic'

export default async function HammerScoresPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Admin</Link>
          <span className="text-slate-200">/</span>
          <h1 className="text-lg font-bold text-slate-900">{RATING_NAME}</h1>
        </div>
        <Link
          href="/admin/hammer-scores/config"
          className="text-xs border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          Formula Config →
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-sm text-slate-600">
          0–100 composite rating: Postseason (0–50) + Tournament (0–20) + Match (0–30). Recalculated daily via full-season replay. Tournament scores require point values to be set in the Tournament Strength Report first.
        </p>
      </div>

      <div className="mb-6 border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating name</p>
          <a
            href={RATING_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Name: src/lib/rating.ts ↗
          </a>
        </div>
        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Name</dt>
          <dd className="text-slate-900 font-medium">{RATING_NAME}</dd>
          <dt className="text-slate-500">Short form</dt>
          <dd className="text-slate-900 font-medium">{RATING_SHORT}</dd>
          <dt className="text-slate-500">Bio</dt>
          <dd><RatingBlurbEditor initial={await getRatingBlurb()} /></dd>
        </dl>
        <p className="mt-2 text-xs text-slate-400">
          The bio is edited here and shows on the boys and girls Regular Season leaderboards. The name and short form are the master for both boys and girls, set in that file: changing them there renames the rating site-wide.
        </p>
      </div>

      <HammerScoresGenderSwitch />
    </div>
  )
}
