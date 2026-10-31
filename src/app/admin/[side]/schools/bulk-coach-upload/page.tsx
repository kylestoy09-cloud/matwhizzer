import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { BulkCoachUploadClient } from './BulkCoachUploadClient'

export const dynamic = 'force-dynamic'

export default function BulkCoachUploadPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin/schools" label="← Schools" />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2">Bulk Coach Upload</h1>
      <p className="text-sm text-slate-500 mb-6">
        Upload a CSV to add or update coaches. Required columns:{' '}
        <code className="font-mono text-xs bg-slate-100 px-1">name</code>,{' '}
        <code className="font-mono text-xs bg-slate-100 px-1">school_id</code> or <code className="font-mono text-xs bg-slate-100 px-1">school_name</code>.
        Optional columns: <code className="font-mono text-xs bg-slate-100 px-1">title</code>, <code className="font-mono text-xs bg-slate-100 px-1">email</code>, <code className="font-mono text-xs bg-slate-100 px-1">phone</code>.
        Existing coaches (matched by name + school) will be updated, not duplicated.
      </p>
      <BulkCoachUploadClient />
    </div>
  )
}
