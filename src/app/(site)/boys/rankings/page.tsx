import { createSupabaseAdmin } from '@/lib/supabase/service'
import { PageHeader } from '@/components/PageHeader'
import { RankingsView } from './RankingsView'

export const dynamic = 'force-dynamic'

export default async function BoysRankingsPage() {
  const db = createSupabaseAdmin()

  const [weeksRes, districtsRes, regionsRes] = await Promise.all([
    db.from('individual_ranking_weeks')
      .select('id, week_number, week_date')
      .eq('gender', 'M')
      .order('week_number', { ascending: true }),

    db.from('boys_districts')
      .select('id, name')
      .order('name'),

    db.from('boys_regions')
      .select('id, name')
      .order('name'),
  ])

  const weeks     = (weeksRes.data     ?? []) as { id: number; week_number: number; week_date: string }[]
  const districts = (districtsRes.data ?? []) as { id: number; name: string }[]
  const regions   = (regionsRes.data   ?? []) as { id: number; name: string }[]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <PageHeader title="Boys Rankings" />
        <p className="text-slate-500 text-sm mt-1">Individual in-season rankings · NJ Boys Wrestling</p>
      </div>

      <RankingsView gender="M" weeks={weeks} districts={districts} regions={regions} />
    </div>
  )
}
