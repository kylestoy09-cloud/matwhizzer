import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { HubShell } from '../dashboards/HubShell'
import { RankingsHubClientBoys } from './RankingsHubClientBoys'
import { RATING_NAME } from '@/lib/rating'

export const dynamic = 'force-dynamic'

function RankingsHeader() {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-base font-bold text-slate-800">Rankings Hub — Boys</p>
        <p className="text-sm text-slate-500 font-medium">{RATING_NAME} · Individual · Team</p>
      </div>
    </div>
  )
}

export default async function RankingsHubBoysPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const currentSeason = (await getWorkingSeason('M')).label

  return (
    <HubShell header={<RankingsHeader />}>
      <RankingsHubClientBoys currentSeason={currentSeason} />
    </HubShell>
  )
}
