'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { TournamentRolloverClient } from '@/app/admin/[side]/tournaments/rollover/TournamentRolloverClient'

export function TournamentRolloverWorkspace() {
  const { gender } = useAdminGender()
  return (
    <div className="p-4">
      <TournamentRolloverClient gender={gender} />
    </div>
  )
}
