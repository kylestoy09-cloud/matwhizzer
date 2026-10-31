import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { TournamentRolloverClient } from './TournamentRolloverClient'
import { getWorkingSeason, getPreviousSeason } from '@/lib/season-context'

export const dynamic = 'force-dynamic'

export default async function TournamentRolloverPage() {
  const current = await getWorkingSeason('M')
  const prior   = await getPreviousSeason(current)
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">In-Season Tournament Rollover</h1>
      <p className="text-sm text-slate-500 mb-2">
        Rolls {prior.label} in-season tournaments (invitationals, holiday tournaments, conference tournaments)
        into {current.label}. Enter new dates per tournament — dates are never guessed from last year.
        Tournaments without a date entered are skipped and can be created manually later.
      </p>
      <p className="text-xs text-slate-400 mb-8">
        Postseason events (districts, regions, state) live in a separate table and are not shown here.
      </p>
      <TournamentRolloverClient />
    </div>
  )
}
