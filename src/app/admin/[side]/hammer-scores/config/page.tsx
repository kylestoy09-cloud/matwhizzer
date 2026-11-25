import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HammerConfigEditor } from './HammerConfigEditor'
import { RATING_NAME, RATING_SHORT } from '@/lib/rating'
import { genderOfSide, type AdminSide } from '@/lib/admin-side'
import { ProjectionAccuracyClient } from '../../projection-accuracy/ProjectionAccuracyClient'

export const dynamic = 'force-dynamic'

// Two tabs (Kyle 2026-11-20: "put the projection accuracy as a tab on the WRR Formula page"):
//   Formula              every parameter of the rating
//   Projection Accuracy  how the bout projections did, and the Lever Lab (?tab=projections)
export default async function HammerScoreConfigPage({ params, searchParams }: {
  params: Promise<{ side: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  const { side } = await params
  const { tab } = await searchParams
  const projections = tab === 'projections'
  const gender = genderOfSide(side as AdminSide)
  const tabCls = (on: boolean) => `px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${on ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`

  return (
    <div className={`${projections ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-6 py-10`}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/hammer-scores" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← {RATING_NAME}</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-lg font-bold text-slate-900">{RATING_SHORT} Formula</h1>
      </div>
      <div className="flex gap-1 border-b border-slate-200 mb-8">
        <Link href={`/admin/${side}/hammer-scores/config`} className={tabCls(!projections)}>Formula</Link>
        <Link href={`/admin/${side}/hammer-scores/config?tab=projections`} className={tabCls(projections)}>Projection Accuracy</Link>
      </div>
      {projections ? (
        <>
          <p className="text-sm text-slate-500 mb-6">
            Every bout between two NJ wrestlers is tracked: both ratings going in, what we projected, and what happened. A projection
            is frozen when the bout is first recorded (at the rating update after it&apos;s entered), so this shows how each settings
            version actually did. Test a lever change on the season before saving it; saving makes it the version the site&apos;s
            projections (head-to-head, match cards) use. Projection settings never change a rating.
          </p>
          <ProjectionAccuracyClient gender={gender} />
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-8">
            Every parameter of the {RATING_NAME} formula. Changes take effect on the next recalculation. The active config is loaded by the recalculation script at runtime.
          </p>
          <HammerConfigEditor />
        </>
      )}
    </div>
  )
}
