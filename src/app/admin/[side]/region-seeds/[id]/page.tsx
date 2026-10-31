import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { PostseasonProfileClient } from '../../postseason/PostseasonProfileClient'

export const dynamic = 'force-dynamic'

export default async function RegionProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <PostseasonProfileClient
        tournamentId={Number(id)}
        backHref="/admin/region-seeds"
        backLabel="Regions Hub"
      />
    </div>
  )
}
