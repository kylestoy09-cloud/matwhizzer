import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <SignOutButton />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-sm text-slate-500 mb-1">Signed in as</p>
        <p className="text-slate-900 font-medium">{user.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/bracket"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Bracket Editor</h2>
          <p className="text-xs text-slate-500">View and edit state tournament bracket data</p>
        </Link>
        <Link
          href="/admin/schools"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-1">School Aliases</h2>
          <p className="text-xs text-slate-500">Resolve unmatched abbreviations and verify mappings</p>
        </Link>
        <Link
          href="/admin/districts"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-1">District Verify</h2>
          <p className="text-xs text-slate-500">Add abbreviations for each school by district</p>
        </Link>
        <Link
          href="/admin/region-seeds"
          className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Region Seeds</h2>
          <p className="text-xs text-slate-500">Assign and adjust bracket seeding for girls regions</p>
        </Link>
      </div>
    </div>
  )
}
