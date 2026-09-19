export const dynamic = 'force-dynamic'
export const revalidate = 0

import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { TieResolutionClient } from './TieResolutionClient'

export type TieMeet = {
  id: string
  meet_date: string
  season_id: number
  gender: 'M' | 'F'
  team1_school_id: number
  team2_school_id: number
  team1_name: string
  team2_name: string
  score: number
}

async function fetchTies(gender: 'M' | 'F'): Promise<TieMeet[]> {
  const db = createSupabaseAdmin()
  const table = gender === 'F' ? 'dual_meets_girls' : 'dual_meets'
  const { data, error } = await db
    .from(table)
    .select(`
      id, meet_date, season_id, gender,
      team1_school_id, team2_school_id,
      team1_score, team2_score,
      team1:schools!team1_school_id(display_name),
      team2:schools!team2_school_id(display_name)
    `)
    .eq('tiebreaker_pending', true)
    .order('season_id', { ascending: false })
    .order('meet_date', { ascending: false })

  if (error || !data) return []
  return (data as any[]).map(r => ({
    id: r.id,
    meet_date: r.meet_date,
    season_id: r.season_id,
    gender,
    team1_school_id: r.team1_school_id,
    team2_school_id: r.team2_school_id,
    team1_name: r.team1?.display_name ?? 'Unknown',
    team2_name: r.team2?.display_name ?? 'Unknown',
    score: r.team1_score ?? 0,
  }))
}

export default async function TieResolutionPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || (appUser as any).role !== 'admin') redirect('/signin')

  const [boys, girls] = await Promise.all([fetchTies('M'), fetchTies('F')])
  const ties = [...boys, ...girls].sort((a, b) => {
    if (b.season_id !== a.season_id) return b.season_id - a.season_id
    return a.meet_date < b.meet_date ? 1 : -1
  })

  return <TieResolutionClient ties={ties} />
}
