import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { InSeasonTournament } from '../bracket/types'
import { BoutAuditClient } from './BoutAuditClient'

export const dynamic = 'force-dynamic'

export default async function BoutAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tid?: string }>
}) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { tid } = await searchParams

  const [{ data: boysTournaments }, { data: girlsTournaments }] = await Promise.all([
    supabase.from('in_season_tournaments').select('id, name, season, start_date').order('start_date', { ascending: false }),
    (supabase as any).from('in_season_tournaments_girls').select('id, name, season, start_date').order('start_date', { ascending: false }),
  ])

  const tournaments: InSeasonTournament[] = [
    ...((boysTournaments ?? []) as Omit<InSeasonTournament, 'gender'>[]).map(t => ({ ...t, gender: 'M' as const })),
    ...((girlsTournaments ?? []) as Omit<InSeasonTournament, 'gender'>[]).map(t => ({ ...t, gender: 'F' as const })),
  ].sort((a, b) => b.start_date.localeCompare(a.start_date))

  return (
    <BoutAuditClient
      tournaments={tournaments}
      defaultTid={tid}
    />
  )
}
