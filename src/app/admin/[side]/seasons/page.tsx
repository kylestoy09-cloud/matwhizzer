import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { SeasonLifecycleClient } from './SeasonLifecycleClient'
import { SeasonRolloverClient } from './SeasonRolloverClient'

export const dynamic = 'force-dynamic'

export default function SeasonsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">Seasons &amp; Roster</h1>

      <section className="mb-10">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Season Lifecycle</h2>
        <p className="text-sm text-slate-500 mb-4">
          Manage which season is live on the public site and advance each season through its stages.
          &ldquo;Set as Live&rdquo; is an explicit manual action — it is never applied automatically.
        </p>
        <SeasonLifecycleClient />
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-1">Roster Rollover</h2>
        <p className="text-sm text-slate-500 mb-4">
          Advance wrestlers to their next grade at the end of a season.
        </p>
        <SeasonRolloverClient />
      </section>
    </div>
  )
}
