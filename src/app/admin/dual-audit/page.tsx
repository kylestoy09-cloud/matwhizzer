import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { DualAuditClient } from './DualAuditClient'

export const dynamic = 'force-dynamic'

export type DualMeetOption = {
  id: string
  meet_date: string
  team1_name: string | null
  team2_name: string | null
  gender: string
}

export default async function DualAuditPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: meets } = await supabase
    .from('dual_meets')
    .select(`
      id, meet_date, gender,
      team1:schools!team1_school_id(display_name),
      team2:schools!team2_school_id(display_name)
    `)
    .order('meet_date', { ascending: false })

  const meetOptions: DualMeetOption[] = (meets ?? []).map((m: any) => ({
    id: m.id,
    meet_date: m.meet_date,
    team1_name: m.team1?.display_name ?? null,
    team2_name: m.team2?.display_name ?? null,
    gender: m.gender,
  }))

  return <DualAuditClient meets={meetOptions} />
}
