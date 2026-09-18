import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HomepageTestClient } from './HomepageTestClient'

export const dynamic = 'force-dynamic'

export default async function HomepageTestPage() {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/admin/login')

  return <HomepageTestClient />
}
