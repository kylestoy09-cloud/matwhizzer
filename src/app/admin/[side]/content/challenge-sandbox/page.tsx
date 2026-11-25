import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { SandboxClient } from './SandboxClient'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')
  return <SandboxClient />
}
