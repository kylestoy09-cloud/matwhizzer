import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin }  from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const dynamic = 'force-dynamic'

export async function GET() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createSupabaseAdmin()

  const [usersRes, logRes, queueRes] = await Promise.all([
    db.from('app_users').select('id, display_name, role'),
    // Paged: the API caps each request at 1,000 rows regardless of .limit()
    fetchAllRows((from, to) => db.from('microcheck_task_log')
      .select('admin_id, completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false }).order('id')
      .range(from, to)),
    fetchAllRows((from, to) => db.from('microcheck_tasks')
      .select('completed_by, completed_at')
      .eq('status', 'completed')
      .not('completed_by', 'is', null)
      .order('completed_at', { ascending: false }).order('id')
      .range(from, to)),
  ])

  if (usersRes.error) return NextResponse.json({ error: 'app_users: ' + usersRes.error.message }, { status: 500 })

  // Merge both completion sources into one unified list
  const allCompletions = [
    ...(logRes.data ?? []).map(r => ({ admin_id: r.admin_id, completed_at: r.completed_at })),
    ...(queueRes.data ?? []).map(r => ({ admin_id: r.completed_by!, completed_at: r.completed_at })),
  ]

  const allAdmins = (usersRes.data ?? []).filter(u => {
    if (u.role !== 'admin') return false
    return !(u.display_name ?? '').toLowerCase().includes('bwitt')
  })
  const adminIds = new Set(allAdmins.map(a => a.id))
  const nameOf   = (id: string) => {
    const a = allAdmins.find(u => u.id === id)
    return a?.display_name ?? id
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const totalTally = new Map<string, number>()
  const todayTally = new Map<string, number>()
  const dailyMap   = new Map<string, Map<string, number>>() // date → adminId → count

  for (const row of allCompletions) {
    if (!adminIds.has(row.admin_id)) continue
    totalTally.set(row.admin_id, (totalTally.get(row.admin_id) ?? 0) + 1)

    const dateStr = row.completed_at
      ? new Date(row.completed_at).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      : ''
    if (!dateStr) continue

    if (dateStr === todayStr)
      todayTally.set(row.admin_id, (todayTally.get(row.admin_id) ?? 0) + 1)

    if (!dailyMap.has(dateStr)) dailyMap.set(dateStr, new Map())
    const dm = dailyMap.get(dateStr)!
    dm.set(row.admin_id, (dm.get(row.admin_id) ?? 0) + 1)
  }

  // All-time scoreboard
  const scoreboard = allAdmins
    .map(u => ({ admin_id: u.id, name: nameOf(u.id), completed: totalTally.get(u.id) ?? 0 }))
    .sort((a, b) => b.completed - a.completed)

  // Today's scoreboard
  const today = allAdmins
    .map(u => ({ admin_id: u.id, name: nameOf(u.id), completed: todayTally.get(u.id) ?? 0 }))
    .sort((a, b) => b.completed - a.completed)

  // Daily kings — last 30 days (only days with activity); tiebreaker = total tasks
  const dailyKings = [...dailyMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30)
    .flatMap(([date, dm]) => {
      let kingId = '', kingCount = 0
      for (const [id, count] of dm) {
        if (!adminIds.has(id)) continue
        const beats = count > kingCount ||
          (count === kingCount && (totalTally.get(id) ?? 0) > (totalTally.get(kingId) ?? 0))
        if (beats) { kingCount = count; kingId = id }
      }
      if (!kingId || kingCount === 0) return []
      return [{ date, admin_id: kingId, name: nameOf(kingId), count: kingCount }]
    })

  // Monthly royalty — per month: king = most days as daily king, tiebreaker = total tasks
  // Also include full standings per month for the monthly leaderboard view
  const monthMap = new Map<string, Map<string, number>>() // month → adminId → days as king
  for (const k of dailyKings) {
    const month = k.date.slice(0, 7)
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const mm = monthMap.get(month)!
    mm.set(k.admin_id, (mm.get(k.admin_id) ?? 0) + 1)
  }
  const monthlyRoyalty = [...monthMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, mm]) => {
      // Standings: sort by days desc, tiebreaker total tasks desc
      const standings = [...mm.entries()]
        .map(([id, days]) => ({ admin_id: id, name: nameOf(id), days, totalTasks: totalTally.get(id) ?? 0 }))
        .sort((a, b) => b.days - a.days || b.totalTasks - a.totalTasks)
      const king = standings[0]
      return { month, admin_id: king?.admin_id ?? '', name: king?.name ?? '', days: king?.days ?? 0, standings }
    })

  return NextResponse.json({ scoreboard, today, dailyKings, monthlyRoyalty })
}
