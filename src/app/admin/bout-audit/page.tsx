import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { InSeasonTournament } from '../bracket/types'
import { BoutAuditClient } from './BoutAuditClient'

export const dynamic = 'force-dynamic'

export default async function BoutAuditPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: tournaments } = await supabase
    .from('in_season_tournaments')
    .select('id, name, season, start_date')
    .order('start_date', { ascending: false })

  return (
    <BoutAuditClient
      tournaments={(tournaments ?? []) as InSeasonTournament[]}
    />
  )
}
