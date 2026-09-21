import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { HubShell } from '../dashboards/HubShell'
import { RankingsHubClientGirls } from '../rankings-hub/RankingsHubClientGirls'

export const dynamic = 'force-dynamic'

function RankingsHeader() {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-base font-bold text-slate-800">Rankings Hub — Girls</p>
        <p className="text-sm text-slate-500 font-medium">Hammer Scores · Individual · Team</p>
      </div>
    </div>
  )
}

export default async function RankingsHubGirlsPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const currentSeason = (await getWorkingSeason('F')).label

  return (
    <HubShell header={<RankingsHeader />}>
      <RankingsHubClientGirls currentSeason={currentSeason} />
    </HubShell>
  )
}
