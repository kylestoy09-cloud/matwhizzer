import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HubClient } from '../_hub/HubClient'
import { hubSeasons } from '../_hub/hubSeasons'

export const dynamic = 'force-dynamic'

export default async function Page({ searchParams }: { searchParams: Promise<{ season?: string; tab?: string }> }) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  const sp = await searchParams
  const { seasons, season } = hubSeasons('ms', sp.season)
  return <HubClient hub="ms" seasons={seasons} season={season} howTo={sp.tab === 'howto'} />
}
