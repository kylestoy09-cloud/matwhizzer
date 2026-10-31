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

  const MEET_SELECT = `id, meet_date, team1:schools!team1_school_id(display_name), team2:schools!team2_school_id(display_name)`

  const [{ data: boysRaw }, { data: girlsRaw }] = await Promise.all([
    supabase.from('dual_meets').select(MEET_SELECT).order('meet_date', { ascending: false }),
    (supabase as any).from('dual_meets_girls').select(MEET_SELECT).order('meet_date', { ascending: false }),
  ])

  const toOption = (m: any, g: 'M' | 'F'): DualMeetOption => ({
    id: m.id,
    meet_date: m.meet_date,
    team1_name: m.team1?.display_name ?? null,
    team2_name: m.team2?.display_name ?? null,
    gender: g,
  })

  const meetOptions: DualMeetOption[] = [
    ...(boysRaw ?? []).map((m: any) => toOption(m, 'M')),
    ...(girlsRaw ?? []).map((m: any) => toOption(m, 'F')),
  ].sort((a, b) => b.meet_date.localeCompare(a.meet_date))

  return <DualAuditClient meets={meetOptions} />
}
