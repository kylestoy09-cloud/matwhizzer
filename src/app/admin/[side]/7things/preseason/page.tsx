import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { PreseasonWorkspace } from './PreseasonWorkspace'

export const dynamic = 'force-dynamic'
export const metadata = { title: '7 Things — Preseason' }

export default async function PreseasonArticlePage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')
  return <PreseasonWorkspace />
}
