import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { DualHubHeader } from './DualHubHeader'
import { DualHubClient } from './DualHubClient'

export const dynamic = 'force-dynamic'

export default async function DualHubPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Total meets and completed counts — boys from dual_meets, girls from dual_meets_girls
  const [boysTotal, girlsTotal, boysCompleted, girlsCompleted] = await Promise.all([
    db.from('dual_meets').select('id', { count: 'exact', head: true }),
    db.from('dual_meets_girls').select('id', { count: 'exact', head: true }),
    db.from('dual_meet_matches').select('dual_meet_id').then(r =>
      new Set((r.data ?? []).map((m: any) => m.dual_meet_id)).size),
    db.from('dual_meet_matches_girls').select('dual_meet_id').then(r =>
      new Set((r.data ?? []).map((m: any) => m.dual_meet_id)).size),
  ])

  const totalM    = boysTotal.count  ?? 0
  const totalF    = girlsTotal.count ?? 0
  const completedM = boysCompleted  as number
  const completedF = girlsCompleted as number

  return (
    <HubShell
      header={
        <DualHubHeader
          totalM={totalM}         completedM={completedM}
          totalF={totalF}         completedF={completedF}
        />
      }
    >
      <DualHubClient />
    </HubShell>
  )
}
