import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { HubShell } from '../dashboards/HubShell'
import { MatchCardTestClient } from './MatchCardTestClient'
import { getSiteLook } from '@/lib/siteLookServer'

export const dynamic = 'force-dynamic'

export default async function MatchCardPage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const header = (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-base font-bold text-slate-800">Match Card</p>
        <p className="text-sm text-slate-500 font-medium">Test Harness</p>
      </div>
      <p className="text-xs text-slate-400">Select a dual meet and phase to preview the match card at each stage.</p>
    </div>
  )

  // the site's own header over the card (Kyle 2026-11-19: "this still needs to display the site header"), in the saved look
  const look = await getSiteLook()
  return (
    <HubShell header={header}>
      <MatchCardTestClient headerLayout={look.headerLayout} />
    </HubShell>
  )
}
