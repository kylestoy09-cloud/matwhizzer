import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HammerScoresPageClientBoys } from './HammerScoresPageClientBoys'
import { RATING_NAME } from '@/lib/rating'

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

      <HammerScoresPageClientBoys />
    </div>
  )
}
