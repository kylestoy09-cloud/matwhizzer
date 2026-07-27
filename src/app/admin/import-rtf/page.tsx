import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { AdminBackButton } from '../AdminBackButton'
import { RtfImportClient } from './RtfImportClient'

export const dynamic = 'force-dynamic'

export default async function ImportRtfPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-2">
        <AdminBackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">RTF Tournament Import</h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste the plain-text export of your tournament RTF, review school and wrestler
          matches, then import bouts and placements.
        </p>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          textutil -convert txt -stdout &quot;Dec 2025 Tournaments.rtf&quot; | pbcopy
        </p>
      </div>
      <RtfImportClient />
    </div>
  )
}
