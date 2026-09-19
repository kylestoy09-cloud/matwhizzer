import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { PastSeasonsClient } from '../past-seasons/PastSeasonsClient'

export const dynamic = 'force-dynamic'

export default async function PastSeasonsGirlsPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Past = archived for girls, independent of which season is the public default
  const { data: archivedStates } = await db
    .from('season_gender_state')
    .select('season_id')
    .eq('gender', 'F')
    .eq('stage', 'archived')

  const archivedIds = (archivedStates ?? []).map(s => s.season_id as number)

  const { data: seasons } = archivedIds.length === 0 ? { data: [] } : await db
    .from('seasons')
    .select('id, year_label')
    .in('id', archivedIds)
    .not('year_label', 'is', null)
    .order('id', { ascending: false })

  const pastSeasons = (seasons ?? []).filter(s => s.year_label) as { id: number; year_label: string }[]

  return (
    <HubShell header={<></>}>
      <PastSeasonsClient seasons={pastSeasons} gender="F" />
    </HubShell>
  )
}
