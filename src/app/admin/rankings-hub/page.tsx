import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { RankingsHubSwitch } from './RankingsHubSwitch'

export const dynamic = 'force-dynamic'

export default async function RankingsHubPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const [boysSeason, girlsSeason] = await Promise.all([getWorkingSeason('M'), getWorkingSeason('F')])

  return <RankingsHubSwitch boysSeason={boysSeason.label} girlsSeason={girlsSeason.label} />
}
