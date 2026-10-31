import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { BulkSchoolUploadClient } from './BulkSchoolUploadClient'

export const dynamic = 'force-dynamic'

export default function BulkSchoolUploadPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin/schools" label="← Schools" />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">Bulk School Data Upload</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload a CSV to update school profile fields in bulk. Required columns: <code className="font-mono text-xs bg-slate-100 px-1">school_id</code> or <code className="font-mono text-xs bg-slate-100 px-1">name</code>.
        Optional columns: any editable field (display_name, short_name, mascot, nickname, color_primary, color_secondary,
        color_tertiary, header_background, town, county, section, classification, athletic_conference, website_url, twitter_handle, logo_url).
      </p>
      <BulkSchoolUploadClient />
    </div>
  )
}
