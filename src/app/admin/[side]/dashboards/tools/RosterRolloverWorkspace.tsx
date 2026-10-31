'use client'

import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { SeasonRolloverClient } from '@/app/admin/[side]/seasons/SeasonRolloverClient'

export function RosterRolloverWorkspace() {
  const { gender } = useAdminGender()
  return (
    <div className="p-4">
      <SeasonRolloverClient gender={gender} />
    </div>
  )
}
