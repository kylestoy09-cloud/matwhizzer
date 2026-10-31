import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { InSeasonTournament } from '../bracket/types'
import { BoutAuditClient } from './BoutAuditClient'

export const dynamic = 'force-dynamic'

export default async function BoutAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ side: string }>
  searchParams: Promise<{ tid?: string }>
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { tid } = await searchParams
  const gender = (await params).side === 'girls' ? 'F' : 'M'

  // This side's tournaments only
  const { data } = await supabase
    .from(gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments')
    .select('id, name, season, start_date')
    .order('start_date', { ascending: false })

  const tournaments: InSeasonTournament[] = ((data ?? []) as Omit<InSeasonTournament, 'gender'>[])
    .map(t => ({ ...t, gender }))

  return (
    <BoutAuditClient
      tournaments={tournaments}
      defaultTid={tid}
    />
  )
}
