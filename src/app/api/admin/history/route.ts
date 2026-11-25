// NJ wrestling history for the Daily Challenge research tabs (admin only), one side at a time (?gender=M|F; girls
// added 2026-11-13). Small enough (≈13k rows) to send whole; the page groups and sorts it. Team titles are boys only.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { schoolMatcher, historyFinishSchools, historySchoolNames } from '@/lib/historySchools'
import { sameLastName } from '@/lib/trophyRows'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const gender = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const db = createSupabaseAdmin()
  const finishes: { level: string; year: number; region: number | null; weight: string; place: number; name: string; school: string | null; school_listed?: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('history_finishes').select('level, year, region, region_name, weight, place, tie, name, school, note').eq('gender', gender).order('id').range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    finishes.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const titles: unknown[] = []
  for (let from = 0; gender === 'M'; from += 1000) {
    const { data, error } = await db.from('history_team_titles').select('kind, year, grp, section, champion, runner_up').order('id').range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    titles.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  // One name per school (Kyle 2026-11-14: the Explorer listed schools several times, spelled differently): a school on
  // our list shows as we name it, any other with one spelling (src/lib/historySchools.ts); the name as listed stays in
  // school_listed. Each school's NJSIAA section comes with it (Kyle 2026-11-13: sort schools by section).
  const m = await schoolMatcher(db)
  const ids = historyFinishSchools(finishes, m, sameLastName)
  const spell = historySchoolNames(finishes.map(f => f.school).filter(Boolean) as string[])
  const sections: Record<string, string> = {}
  finishes.forEach((f, i) => {
    const id = ids[i], s = id != null ? m.school.get(id) : null
    f.school_listed = f.school
    if (!f.school?.trim()) return
    f.school = s?.display_name ?? spell(f.school)
    if (s?.section) sections[f.school] = s.section
  })
  // team titles the same way
  for (const t of titles as { champion: string; runner_up: string | null }[]) {
    const name = (n: string) => { const id = m.idOf(n); return id != null ? m.school.get(id)!.display_name : spell(n) }
    t.champion = name(t.champion)
    if (t.runner_up) t.runner_up = name(t.runner_up)
  }
  return NextResponse.json({ finishes, titles, sections })
}
