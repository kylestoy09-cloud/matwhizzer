// Whether a signed-in account is an admin (app_users.role = 'admin'). Signing in is not
// enough: fans have accounts too. Used by src/proxy.ts (the gate in front of /admin and
// /api/admin) and by every admin API route; scripts/check-admin-routes.mjs fails the build
// if an admin route doesn't check.

import { createSupabaseAdmin } from '@/lib/supabase/service'
import { createSupabaseServer } from '@/lib/supabase/server'

export async function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const { data } = await createSupabaseAdmin().from('app_users').select('role').eq('id', userId).maybeSingle()
  return data?.role === 'admin'
}

/** The signed-in admin, or null (no session, or not an admin). */
export async function getAdminUser() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return user && (await isAdminUser(user.id)) ? user : null
}
