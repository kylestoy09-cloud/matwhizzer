import Link from 'next/link'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { RATING_SHORT } from '@/lib/rating'

export const dynamic = 'force-dynamic'

export default async function RankingsPage({ params }: { params: Promise<{ side: string }> }) {
  const { side } = await params
  const label = side === 'girls' ? 'Girls' : 'Boys'
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Rankings — {label}</h1>
      <p className="text-sm text-slate-500 mb-8">
        Build, review, and publish wrestler and team rankings for each scope and period.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/admin/${side}/rankings/individual`}
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Individual Rankings — {label}</p>
          <p className="text-sm text-slate-500">
            State and section rankings by weight class. Seed from {RATING_SHORT}, edit order, publish.
          </p>
        </Link>

        <Link
          href={`/admin/${side}/rankings/team`}
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Team Rankings — {label}</p>
          <p className="text-sm text-slate-500">
            Conference, section, and state team rankings. Seed from Power Points or returning strength, publish snapshots.
          </p>
        </Link>
      </div>
    </div>
  )
}
