import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { HubShell } from '../dashboards/HubShell'
import { PastSeasonsClient } from './PastSeasonsClient'

export const dynamic = 'force-dynamic'

export default async function PastSeasonsPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  // Current live boys season — exclude from the past seasons list
  const { data: liveSgs } = await db
    .from('season_gender_state')
    .select('season_id')
    .eq('gender', 'M')
    .eq('is_public_default', true)
    .maybeSingle()

  const currentSeasonId = liveSgs?.season_id ?? -1

  const { data: seasons } = await db
    .from('seasons')
    .select('id, year_label')
    .neq('id', currentSeasonId)
    .not('year_label', 'is', null)
    .order('id', { ascending: false })

  const pastSeasons = (seasons ?? []).filter(s => s.year_label) as { id: number; year_label: string }[]

  return (
    <HubShell header={<></>}>
      <PastSeasonsClient seasons={pastSeasons} gender="M" />
    </HubShell>
  )
}
