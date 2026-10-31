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

export default async function DualAuditPage({ params }: { params: Promise<{ side: string }> }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const MEET_SELECT = `id, meet_date, team1:schools!team1_school_id(display_name), team2:schools!team2_school_id(display_name)`

  // This side's meets only
  const gender: 'M' | 'F' = (await params).side === 'girls' ? 'F' : 'M'
  const { data: raw } = await (supabase as any)
    .from(gender === 'F' ? 'dual_meets_girls' : 'dual_meets')
    .select(MEET_SELECT)
    .order('meet_date', { ascending: false })

  const toOption = (m: any, g: 'M' | 'F'): DualMeetOption => ({
    id: m.id,
    meet_date: m.meet_date,
    team1_name: m.team1?.display_name ?? null,
    team2_name: m.team2?.display_name ?? null,
    gender: g,
  })

  const meetOptions: DualMeetOption[] = (raw ?? []).map((m: any) => toOption(m, gender))

  return <DualAuditClient meets={meetOptions} />
}
