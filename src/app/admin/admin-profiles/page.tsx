import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminProfilesClient } from './AdminProfilesClient'

export const dynamic = 'force-dynamic'

const SUPER_ADMIN_EMAIL = 'kyle.stoy09@gmail.com'

export default async function AdminProfilesPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    redirect('/admin')
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold mb-1">Admin Profiles</h1>
      <p className="text-slate-500 text-sm mb-6">
        All admin accounts. Use Reset Password to send a recovery link.
      </p>
      <AdminProfilesClient />
    </div>
  )
}
