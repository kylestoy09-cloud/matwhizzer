import { createSupabaseAdmin } from '@/lib/supabase/service'
import { createSupabaseServer } from '@/lib/supabase/server'
import { redirect }             from 'next/navigation'

const FIELD_LABELS: Record<string, string> = {
  address:        'Address',
  website_url:    'Website',
  twitter_handle: 'Twitter / X',
  facebook_url:   'Facebook',
  coach_name:     'Coach Name',
  coach_email:    'Coach Email',
  ad_name:        'AD Name',
  ad_email:       'AD Email',
  roster_match:   'Roster Match',
}

export default async function CantFindPage() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createSupabaseAdmin()

  const [logRes, schoolsRes, usersRes] = await Promise.all([
    db.from('microcheck_task_log')
      .select('id, admin_id, school_id, gender, field, completed_at')
      .eq('status', 'cant_find')
      .order('completed_at', { ascending: false }),
    db.from('schools').select('id, display_name'),
    db.from('app_users').select('id, display_name'),
  ])

  const schoolMap = new Map((schoolsRes.data ?? []).map(s => [s.id, s.display_name]))
  const userMap   = new Map((usersRes.data ?? []).map(u => [u.id, u.display_name ?? u.id]))
  const rows      = logRes.data ?? []

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/microcheck" className="text-sm text-slate-500 hover:text-slate-900">← Micro Checks</a>
        <h1 className="text-xl font-bold text-slate-900">Can't Find — Review Queue</h1>
        <span className="ml-auto text-sm text-slate-500">{rows.length} items</span>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-slate-500">Nothing flagged as can't find yet.</p>
      )}

      {rows.length > 0 && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200">
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Gender</th>
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Flagged by</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-800">
                  {schoolMap.get(row.school_id) ?? `School ${row.school_id}`}
                </td>
                <td className="px-3 py-2 text-slate-500">{row.gender === 'M' ? 'Boys' : 'Girls'}</td>
                <td className="px-3 py-2 text-slate-600">{FIELD_LABELS[row.field] ?? row.field}</td>
                <td className="px-3 py-2 text-slate-500">{userMap.get(row.admin_id) ?? row.admin_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-slate-400 text-xs">
                  {new Date(row.completed_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
