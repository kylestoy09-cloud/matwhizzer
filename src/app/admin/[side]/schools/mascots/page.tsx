import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { MascotDirectoryClient } from './MascotDirectoryClient'

export const dynamic = 'force-dynamic'

export default async function MascotDirectoryPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()
  const { data } = await db
    .from('schools')
    .select(`
      id, display_name, mascot, logo_url, logo_direction,
      header_background, color_primary, color_secondary, color_tertiary,
      primary_color, secondary_color
    `)
    .eq('is_nj', true)
    .order('display_name')

  const schools = (data ?? []) as Array<{
    id: number
    display_name: string
    mascot: string | null
    logo_url: string | null
    logo_direction: 'left' | 'right' | null
    header_background: string | null
    color_primary: string | null
    color_secondary: string | null
    color_tertiary: string | null
    primary_color: string | null
    secondary_color: string | null
  }>

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin/schools" label="← Schools" />
      <div className="mt-4 mb-6">
        <h1 className="text-xl font-bold text-slate-900">Mascots &amp; Logos</h1>
      </div>
      <MascotDirectoryClient schools={schools} />
    </div>
  )
}
