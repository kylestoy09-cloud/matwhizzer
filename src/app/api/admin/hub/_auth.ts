// Shared gate for the tournament hub routes: admins only, and every call names its side.
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import type { HubGender } from '@/lib/hub'

export async function hubAdmin(gender: unknown): Promise<
  { db: ReturnType<typeof createSupabaseAdmin>; gender: HubGender; email: string | null; error?: never } |
  { error: NextResponse }
> {
  const user = await getAdminUser()
  if (!user) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (gender !== 'M' && gender !== 'F' && gender !== 'X') return { error: NextResponse.json({ error: 'gender must be M, F or X (mixed)' }, { status: 400 }) }
  return { db: createSupabaseAdmin(), gender, email: user.email ?? null }
}

export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
