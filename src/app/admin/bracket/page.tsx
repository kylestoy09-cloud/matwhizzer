import { createSupabaseServer } from '@/lib/supabase/server'
import { BracketEditor } from './BracketEditor'

export const dynamic = 'force-dynamic'

export default async function BracketPage() {
  const supabase = await createSupabaseServer()

  const [tournamentsRes, weightClassesRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, tournament_type, gender, season_id')
      .in('tournament_type', ['boys_state', 'girls_state'])
      .order('season_id', { ascending: false })
      .order('name'),
    supabase
      .from('weight_classes')
      .select('id, weight, gender')
      .order('weight'),
  ])

  return (
    <BracketEditor
      tournaments={tournamentsRes.data ?? []}
      weightClasses={weightClassesRes.data ?? []}
    />
  )
}
