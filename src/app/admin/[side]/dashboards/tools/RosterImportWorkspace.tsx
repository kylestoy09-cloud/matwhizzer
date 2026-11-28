'use client'

import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { RosterImportClient } from '@/app/admin/[side]/roster-import/RosterImportClient'

// Preseason step 3 in the dashboard's workspace (the full page has more room)
export function RosterImportWorkspace() {
  const { gender } = useAdminGender()
  const side = gender === 'F' ? 'girls' : 'boys'
  return (
    <div className="p-4">
      <Link href={`/admin/${side}/roster-import`} className="mb-3 inline-block text-xs text-sky-700 underline">Open the full page</Link>
      <RosterImportClient side={side} />
    </div>
  )
}
