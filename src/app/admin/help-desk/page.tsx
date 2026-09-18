import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminBackButton } from '../AdminBackButton'
import { HelpDeskClient } from './HelpDeskClient'

export const dynamic = 'force-dynamic'

export default async function HelpDeskPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: appUser } = await supabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') redirect('/admin')

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin" label="← Dashboard" />
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-6">Help Desk</h1>
      <HelpDeskClient />
    </div>
  )
}
