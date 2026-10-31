import { createSupabaseServer } from '@/lib/supabase/server'

/** The signed-in admin, or null. */
export async function requireMicrocheckAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}
