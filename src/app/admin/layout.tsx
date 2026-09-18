import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { AdminGenderProvider } from '@/components/admin/AdminGenderContext'
import { AdminShell } from './AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/signin')

  const db = createSupabaseAdmin()
  const { data: appUser } = await db
    .from('app_users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!appUser || appUser.role !== 'admin') redirect('/signin')

  return (
    <AdminGenderProvider>
      <AdminShell>{children}</AdminShell>
    </AdminGenderProvider>
  )
}
