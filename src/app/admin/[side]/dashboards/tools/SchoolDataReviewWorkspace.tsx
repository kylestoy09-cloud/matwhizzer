'use client'

import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { TrackTeamsReview } from '@/app/admin/[side]/school-data-review/TrackTeamsReview'

// Preseason step 1 in the dashboard's workspace (the full page has more room)
export function SchoolDataReviewWorkspace() {
  const { gender } = useAdminGender()
  const side = gender === 'F' ? 'girls' : 'boys'
  return (
    <div className="p-4">
      <Link href={`/admin/${side}/school-data-review`} className="mb-3 inline-block text-xs text-sky-700 underline">Open the full page</Link>
      <TrackTeamsReview side={side} />
    </div>
  )
}
