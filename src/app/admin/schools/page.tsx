import { createSupabaseServer } from '@/lib/supabase/server'
import { SchoolAliasManager } from './SchoolAliasManager'
import { AdminBackButton } from '../AdminBackButton'

export const dynamic = 'force-dynamic'

export default async function SchoolsPage() {
  const supabase = await createSupabaseServer()

  const [schoolsRes, districtsRes] = await Promise.all([
    supabase
      .from('schools')
      .select('id, display_name, short_name')
      .order('display_name'),
    supabase
      .from('districts')
      .select('id, name, region_id')
      .order('id'),
  ])

  return (
    <>
    <div className="max-w-5xl mx-auto px-4 pt-4">
      <AdminBackButton />
    </div>
    <SchoolAliasManager
      schools={(schoolsRes.data ?? []) as Array<{ id: number; display_name: string; short_name: string | null }>}
      districts={(districtsRes.data ?? []) as Array<{ id: number; name: string; region_id: number | null }>}
    />
    </>
  )
}
