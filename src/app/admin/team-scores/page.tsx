import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseServer } from '@/lib/supabase/server'
import { TeamScoresClient } from './TeamScoresClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TeamScoresPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← Admin</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-lg font-bold text-slate-900">Import Team Scores</h1>
      </div>
      <Suspense fallback={null}>
        <TeamScoresClient />
      </Suspense>
    </div>
  )
}
