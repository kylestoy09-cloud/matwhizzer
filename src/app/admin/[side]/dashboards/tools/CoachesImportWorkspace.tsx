'use client'

import { BulkCoachUploadClient } from '@/app/admin/[side]/schools/bulk-coach-upload/BulkCoachUploadClient'

export function CoachesImportWorkspace() {
  return (
    <div className="p-4">
      <BulkCoachUploadClient />
    </div>
  )
}
