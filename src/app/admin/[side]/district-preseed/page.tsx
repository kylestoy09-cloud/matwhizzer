import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason } from '@/lib/season-context'
import { DistrictPreseedClientBoys } from './DistrictPreseedClientBoys'
import { DistrictPreseedClientGirls } from './DistrictPreseedClientGirls'

export const dynamic = 'force-dynamic'

export default async function DistrictPreseedPage({ params }: { params: Promise<{ side: string }> }) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/admin/login')

  const girls = (await params).side === 'girls'
  const currentSeason = (await getWorkingSeason(girls ? 'F' : 'M')).label

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">District Pre-Seed Calculator — {girls ? 'Girls' : 'Boys'}</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {currentSeason} · NJSIAA formula: Prestige Points + best-20 Caliber Points
        </p>
      </div>
      {girls
        ? <DistrictPreseedClientGirls season={currentSeason} />
        : <DistrictPreseedClientBoys season={currentSeason} />}
    </div>
  )
}
