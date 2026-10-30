import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HammerConfigEditor } from './HammerConfigEditor'
import { RATING_NAME } from '@/lib/rating'

export const dynamic = 'force-dynamic'

export default async function HammerScoreConfigPage() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/hammer-scores" className="text-xs text-slate-400 hover:text-slate-700 transition-colors">← {RATING_NAME}</Link>
        <span className="text-slate-200">/</span>
        <h1 className="text-lg font-bold text-slate-900">Formula Config</h1>
      </div>
      <p className="text-sm text-slate-500 mb-8">
        Every parameter of the {RATING_NAME} formula. Changes take effect on the next recalculation. The active config is loaded by the recalculation script at runtime.
      </p>
      <HammerConfigEditor />
    </div>
  )
}
