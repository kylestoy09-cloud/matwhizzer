'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { HubShell } from '../dashboards/HubShell'
import { RankingsHubClientBoys } from './RankingsHubClientBoys'
import { RankingsHubClientGirls } from './RankingsHubClientGirls'

function Header() {
  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-base font-bold text-slate-800">Rankings Hub</p>
        <p className="text-sm text-slate-500 font-medium">Hammer Scores · Individual · Team</p>
      </div>
    </div>
  )
}

export function RankingsHubSwitch({ boysSeason, girlsSeason }: { boysSeason: string; girlsSeason: string }) {
  const { gender } = useAdminGender()
  const isGirls = gender === 'F'

  return (
    <HubShell header={<Header />}>
      {isGirls
        ? <RankingsHubClientGirls currentSeason={girlsSeason} />
        : <RankingsHubClientBoys currentSeason={boysSeason} />
      }
    </HubShell>
  )
}
