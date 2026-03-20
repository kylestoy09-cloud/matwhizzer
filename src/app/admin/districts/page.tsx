import { createSupabaseServer } from '@/lib/supabase/server'
import { DistrictVerifier } from './DistrictVerifier'

export const dynamic = 'force-dynamic'

export default async function DistrictsPage() {
  const supabase = await createSupabaseServer()

  const [districtsRes, schoolsRes] = await Promise.all([
    supabase.from('districts').select('id, name, region_id').order('id'),
    supabase.from('schools').select('id, display_name, short_name').order('display_name'),
  ])

  return (
    <DistrictVerifier
      districts={(districtsRes.data ?? []) as Array<{ id: number; name: string; region_id: number | null }>}
      allSchools={(schoolsRes.data ?? []) as Array<{ id: number; display_name: string; short_name: string | null }>}
    />
  )
}
