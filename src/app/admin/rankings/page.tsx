import Link from 'next/link'
import { AdminBackButton } from '../AdminBackButton'

export const dynamic = 'force-dynamic'

export default function RankingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Rankings</h1>
      <p className="text-sm text-slate-500 mb-8">
        Build, review, and publish wrestler and team rankings for each scope and period.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/rankings/individual"
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Individual Rankings — Boys</p>
          <p className="text-sm text-slate-500">
            State and section rankings by weight class. Seed from Hammer Scores, edit order, publish.
          </p>
        </Link>

        <Link
          href="/admin/rankings/individual-girls"
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Individual Rankings — Girls</p>
          <p className="text-sm text-slate-500">
            State and section rankings by weight class. Seed from Hammer Scores, edit order, publish.
          </p>
        </Link>

        <Link
          href="/admin/rankings/team"
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Team Rankings — Boys</p>
          <p className="text-sm text-slate-500">
            Conference, section, and state team rankings. Seed from Power Points or returning strength, publish snapshots.
          </p>
        </Link>

        <Link
          href="/admin/rankings/team-girls"
          className="block border border-slate-200 rounded p-5 hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <p className="font-semibold text-slate-900 mb-1">Team Rankings — Girls</p>
          <p className="text-sm text-slate-500">
            Conference, section, and state team rankings. Seed from Power Points or returning strength, publish snapshots.
          </p>
        </Link>
      </div>
    </div>
  )
}
