import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { ResolveUnknownsClientGirls } from './ResolveUnknownsClientGirls'

export const dynamic = 'force-dynamic'

export type UnknownMatchGirls = {
  id: string
  weight_class: number
  result_type: string | null
  result_detail: string | null
  unknown_school: string
  opponent_school: string
  opponent_wrestler_id: string | null
  opponent_name: string | null
  winner_id: string | null
  meet_date: string | null
}

export default async function ResolveUnknownsGirlsPage() {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const { data: unknowns } = await db
    .from('wrestlers')
    .select('id')
    .ilike('first_name', 'Unknown')
    .eq('last_name', '')
    .eq('gender', 'F')

  const ids = (unknowns ?? []).map(w => w.id)
  const allUnknownIds = new Set(ids)

  if (ids.length === 0) {
    return <ResolveUnknownsClientGirls initialMatches={[]} />
  }

  const filter = ids.flatMap(id => [`wrestler_a_id.eq.${id}`, `wrestler_b_id.eq.${id}`]).join(',')
  const { data: duals } = await (db as any)
    .from('dual_meet_matches_girls')
    .select('id, weight_class, result_type, result_detail, school_a_id, school_b_id, wrestler_a_id, wrestler_b_id, winner_id, dual_meet_id')
    .or(filter)

  const allDuals: any[] = duals ?? []
  const schoolIds   = [...new Set(allDuals.flatMap((d: any) => [d.school_a_id, d.school_b_id]).filter(Boolean))] as number[]
  const wrestlerIds = [...new Set(allDuals.flatMap((d: any) => [d.wrestler_a_id, d.wrestler_b_id]).filter((id: unknown): id is string => typeof id === 'string' && !allUnknownIds.has(id)))]
  const meetIds     = [...new Set(allDuals.map((d: any) => d.dual_meet_id).filter(Boolean))] as string[]

  const [{ data: schools }, { data: opponents }, { data: meets }] = await Promise.all([
    schoolIds.length   ? db.from('schools').select('id, display_name').in('id', schoolIds) : Promise.resolve({ data: [] }),
    wrestlerIds.length ? db.from('wrestlers').select('id, first_name, last_name').in('id', wrestlerIds) : Promise.resolve({ data: [] }),
    meetIds.length     ? (db as any).from('dual_meets_girls').select('id, meet_date').in('id', meetIds) : Promise.resolve({ data: [] }),
  ])

  const schoolMap   = new Map((schools   ?? []).map(s => [s.id,  s.display_name]))
  const wrestlerMap = new Map((opponents ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`.trim()]))
  const meetMap     = new Map((meets     ?? []).map((m: any) => [m.id, m.meet_date as string | null]))

  const matches: UnknownMatchGirls[] = allDuals.map((d: any) => {
    const aIsUnknown = allUnknownIds.has(d.wrestler_a_id ?? '')
    const opponentId = aIsUnknown ? d.wrestler_b_id : d.wrestler_a_id
    return {
      id:                   d.id,
      weight_class:         d.weight_class,
      result_type:          d.result_type,
      result_detail:        d.result_detail,
      unknown_school:       schoolMap.get(aIsUnknown ? d.school_a_id : d.school_b_id) ?? '—',
      opponent_school:      schoolMap.get(aIsUnknown ? d.school_b_id : d.school_a_id) ?? '—',
      opponent_wrestler_id: opponentId ?? null,
      opponent_name:        opponentId ? (wrestlerMap.get(opponentId) ?? null) : null,
      winner_id:            d.winner_id,
      meet_date:            (meetMap.get(d.dual_meet_id) ?? null) as string | null,
    }
  }).sort((a, b) => {
    const rt = (a.result_type ?? 'zz').localeCompare(b.result_type ?? 'zz')
    return rt !== 0 ? rt : a.weight_class - b.weight_class
  })

  return <ResolveUnknownsClientGirls initialMatches={matches} />
}
