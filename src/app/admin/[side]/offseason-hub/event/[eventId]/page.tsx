import { redirect, notFound } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { EventClient } from '../../../_hub/EventClient'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ eventId: string }> }) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  const id = Number((await params).eventId)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return <EventClient eventId={id} hub="offseason" />
}
