import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { AdminGenderProvider } from '@/components/admin/AdminGenderContext'
import { AdminShell } from './AdminShell'
import { ADMIN_SIDE_COOKIE, isAdminSide } from '@/lib/admin-side'

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

  const lastSide = (await cookies()).get(ADMIN_SIDE_COOKIE)?.value

  return (
    <AdminGenderProvider lastSide={isAdminSide(lastSide) ? lastSide : null}>
      <AdminShell>{children}</AdminShell>
    </AdminGenderProvider>
  )
}
