import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { CollegeClient } from './CollegeClient'

export const dynamic = 'force-dynamic'

export default function CollegePage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="mt-4 mb-1 text-xl font-bold text-slate-900">College</h1>
      <p className="mb-4 text-sm text-slate-500">College championship results, tied to our wrestlers. Certain matches (same full name, the only NJ wrestler with it, 1–5 years after high school) go in on their own; everything else waits here for you.</p>
      <CollegeClient />
    </div>
  )
}
