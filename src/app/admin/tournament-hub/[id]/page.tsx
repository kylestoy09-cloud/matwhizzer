import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TournamentDetailClient } from './TournamentDetailClient'

export const dynamic = 'force-dynamic'

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <TournamentDetailClient registryId={id} />
    </div>
  )
}
