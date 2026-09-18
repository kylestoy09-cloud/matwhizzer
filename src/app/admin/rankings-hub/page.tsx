import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { RankingsHubSwitch } from './RankingsHubSwitch'

export const dynamic = 'force-dynamic'

export default async function RankingsHubPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { data: seasons } = await db
    .from('seasons')
    .select('id, year_label')
    .order('id', { ascending: false })
    .limit(5)

  const currentSeason = seasons?.[0]?.year_label ?? '2025-26'

  return <RankingsHubSwitch currentSeason={currentSeason} />
}
