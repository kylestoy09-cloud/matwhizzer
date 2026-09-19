import { createSupabaseServer } from '@/lib/supabase/server'
import { getNewestSeason } from '@/lib/season-context'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { AdminBackButton } from '../../AdminBackButton'
import { SchoolProfileClient } from './SchoolProfileClient'
import { getAllConferences } from '@/lib/conferences'
import { getAllSections, getGroupsForSection } from '@/lib/sections'

export const dynamic = 'force-dynamic'

function serviceDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export default async function SchoolProfileAdminPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const schoolId = parseInt(id, 10)
  if (isNaN(schoolId)) notFound()

  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) notFound()

  const db = serviceDb()
  const CURRENT_SEASON = (await getNewestSeason()).id

  const [
    schoolRes,
    boysDistrictsRes,
    girlsDistrictsRes,
    boysRegionsRes,
    girlsRegionsRes,
    // Current assignments — boys
    bsdRes,
    bsrRes,
    bscRes,
    bspRes,
    // Current assignments — girls
    gsdRes,
    gsrRes,
    gscRes,
    gspRes,
    meetsRes,
    wrestlersRes,
  ] = await Promise.all([
    db.from('schools').select(`
      id, display_name, short_name, mascot, nickname,
      color_primary, color_secondary, color_tertiary, header_background,
      primary_color, secondary_color, tertiary_color,
      town, county, website_url, twitter_handle, logo_url,
      founded_year, is_nj, logo_direction, locale_section,
      ad_name, ad_email
    `).eq('id', schoolId).single(),

    db.from('boys_districts').select('id, name').order('name'),
    db.from('girls_districts').select('id, name').order('name'),
    db.from('boys_regions').select('id, name').order('name'),
    db.from('girls_regions').select('id, name').order('name'),

    db.from('boys_school_districts').select('district_id')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('boys_school_regions').select('region_id')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('boys_school_conferences').select('conference')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('boys_school_profiles').select('section, classification')
      .eq('school_id', schoolId).maybeSingle(),

    db.from('girls_school_districts').select('district_id')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('girls_school_regions').select('region_id')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('girls_school_conferences').select('conference')
      .eq('school_id', schoolId).eq('season_id', CURRENT_SEASON).maybeSingle(),
    db.from('girls_school_profiles').select('section, classification')
      .eq('school_id', schoolId).maybeSingle(),

    Promise.all([
      db.from('dual_meets').select(`
        id, meet_date, season_id, status,
        team1:schools!team1_school_id(id, display_name),
        team2:schools!team2_school_id(id, display_name)
      `).or(`team1_school_id.eq.${schoolId},team2_school_id.eq.${schoolId}`).order('meet_date', { ascending: false }).limit(30),
      db.from('dual_meets_girls').select(`
        id, meet_date, season_id, status,
        team1:schools!team1_school_id(id, display_name),
        team2:schools!team2_school_id(id, display_name)
      `).or(`team1_school_id.eq.${schoolId},team2_school_id.eq.${schoolId}`).order('meet_date', { ascending: false }).limit(30),
    ]).then(([boys, girls]) => ({
      data: [
        ...(boys.data ?? []).map((m: any) => ({ ...m, gender: 'M' })),
        ...(girls.data ?? []).map((m: any) => ({ ...m, gender: 'F' })),
      ].sort((a, b) => b.meet_date.localeCompare(a.meet_date)).slice(0, 60),
    })),

    db.from('tournament_entries').select(`
      wrestler_id, weight_class,
      wrestlers(id, first_name, last_name, suffix, gender)
    `).eq('school_id', schoolId),
  ])

  if (!schoolRes.data) notFound()

  const school = schoolRes.data as Record<string, unknown>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meets = (meetsRes.data ?? []) as any[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entryRows = (wrestlersRes.data ?? []) as any[]
  const wrestlerMap = new Map<string, { id: string; name: string; weights: number[]; gender: string }>()
  for (const r of entryRows) {
    const w = r.wrestlers
    if (!w) continue
    const name = [w.first_name, w.last_name, w.suffix].filter(Boolean).join(' ')
    const wc = typeof r.weight_class === 'number' ? r.weight_class : null
    const existing = wrestlerMap.get(w.id)
    if (existing) {
      if (wc && !existing.weights.includes(wc)) existing.weights.push(wc)
    } else {
      wrestlerMap.set(w.id, { id: w.id, name, weights: wc ? [wc] : [], gender: w.gender ?? 'M' })
    }
  }
  const wrestlers = [...wrestlerMap.values()].sort((a, b) => a.name.localeCompare(b.name))

  const sections = getAllSections()
  const conferences = getAllConferences()
  const allGroupsBySection: Record<string, string[]> = {}
  for (const s of sections) {
    allGroupsBySection[s.name] = getGroupsForSection(s.name)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton href="/admin/schools" label="← Schools" />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-6">
        {school.display_name as string} <span className="text-slate-400 font-normal text-sm">#{schoolId}</span>
      </h1>

      <SchoolProfileClient
        schoolId={schoolId}
        school={school}
        currentSeasonId={CURRENT_SEASON}
        meets={meets}
        sections={sections.map(s => s.name)}
        allGroupsBySection={allGroupsBySection}
        conferences={conferences.map(c => c.name)}
        boysDistricts={(boysDistrictsRes.data ?? []) as { id: number; name: string }[]}
        girlsDistricts={(girlsDistrictsRes.data ?? []) as { id: number; name: string }[]}
        boysRegions={(boysRegionsRes.data ?? []) as { id: number; name: string }[]}
        girlsRegions={(girlsRegionsRes.data ?? []) as { id: number; name: string }[]}
        wrestlers={wrestlers}
        boys={{
          districtId:     (bsdRes.data as { district_id: number } | null)?.district_id ?? null,
          regionId:       (bsrRes.data as { region_id: number }   | null)?.region_id   ?? null,
          conference:     (bscRes.data as { conference: string }   | null)?.conference  ?? null,
          section:        (bspRes.data as { section: string }      | null)?.section     ?? null,
          classification: (bspRes.data as { classification: string } | null)?.classification ?? null,
        }}
        girls={{
          districtId:     (gsdRes.data as { district_id: number } | null)?.district_id ?? null,
          regionId:       (gsrRes.data as { region_id: number }   | null)?.region_id   ?? null,
          conference:     (gscRes.data as { conference: string }   | null)?.conference  ?? null,
          section:        (gspRes.data as { section: string }      | null)?.section     ?? null,
          classification: (gspRes.data as { classification: string } | null)?.classification ?? null,
        }}
      />
    </div>
  )
}
