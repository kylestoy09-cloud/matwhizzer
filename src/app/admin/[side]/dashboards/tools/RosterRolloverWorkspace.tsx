'use client'

import { SeasonRolloverClient } from '@/app/admin/[side]/seasons/SeasonRolloverClient'

export function RosterRolloverWorkspace() {
  return (
    <div className="p-4">
      <SeasonRolloverClient />
    </div>
  )
}
