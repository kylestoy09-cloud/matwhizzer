import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { AestheticClient } from './AestheticClient'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getSeasons } from '@/lib/seasons-server'
import type { CalendarRow } from '@/app/(site)/about/AboutClient'
import { SchoolProfileCore } from '@/app/(site)/schools/_shared/SchoolProfileCore'
import { WrestlerProfileCore } from '@/app/(site)/wrestler/_shared/WrestlerProfileCore'
import { buildOffseasonBoard } from '@/lib/offseasonPublic'
import { CollegeListCore, CollegePageCore } from '@/components/site/CollegePages'
import { loadTournamentBrackets } from '@/lib/tournamentBrackets'

export const dynamic = 'force-dynamic'

// The new pages in the mock (Kyle 2026-11-13) open on these until another is picked: Paulsboro and DePaul Catholic
// (Trophy Case); Cameron Sontz and Elle Changaris (on the Off-Season board)
// College (Kyle 2026-11-17, mock first): Rutgers (91) and Anthony Ashnault
// Brackets (Kyle 2026-11-21): Powerade 2025-26, a full out-of-state bracket with NJ wrestlers in it
const BRACKET_DEFAULT = '930fc38c-966e-43b7-928b-66328ae2513b'
const DEFAULTS = { ms: '309', fs: '22', mw: '11fb1877-6b12-46aa-b29f-d00438963678', fw: '99dc17e8-69d2-412a-bff5-0ae302f9e085', cc: '91', cw: '0ccd2ecb-2e9b-4493-b09a-6c0d8b24e219' }

export default async function AestheticToolPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const pick = { ms: sp.ms || DEFAULTS.ms, fs: sp.fs || DEFAULTS.fs, mw: sp.mw || DEFAULTS.mw, fw: sp.fw || DEFAULTS.fw, cc: sp.cc || DEFAULTS.cc, cw: sp.cw || DEFAULTS.cw }
  // the mock's About shows the coming season: the newest season's NJSIAA calendar
  const next = (await getSeasons())[0]
  const [{ data }, boysBoard, girlsBoard] = await Promise.all([
    createSupabaseAdmin().from('season_calendar')
      .select('id, season_label, event_date, event_date_end, event_time, event_category, event_type, gender, label, notes')
      .eq('season_id', next.id).order('event_date').order('id'),
    // built fresh here (not the site's cache), so the mock shows changes at once
    buildOffseasonBoard('M'), buildOffseasonBoard('F'),
  ])
  const bt = sp.bt || BRACKET_DEFAULT
  const brackets = await loadTournamentBrackets(createSupabaseAdmin() as never, bt)
  const bracketPicker = (
    <form method="get" className="mb-3 flex flex-wrap items-end gap-3 text-xs text-slate-600">
      <label className="flex flex-col">Tournament id<input name="bt" defaultValue={bt} className="border border-slate-300 px-2 py-1 text-xs w-80" /></label>
      <button className="px-3 py-1 bg-black text-white">Show</button>
      <span className="text-slate-400">The id is in the tournament page&apos;s address (/tournaments/…).</span>
    </form>
  )
  const previews = {
    offseason: { M: boysBoard, F: girlsBoard },
    school: {
      M: <SchoolProfileCore schoolParam={pick.ms} gender="boys" activeTab="trophy" preview={{ trophyCase: true, localTabs: true }} />,
      F: <SchoolProfileCore schoolParam={pick.fs} gender="girls" activeTab="trophy" preview={{ trophyCase: true, localTabs: true }} />,
    },
    wrestler: {
      M: <WrestlerProfileCore wrestlerId={pick.mw} preview={{ offseason: true, order: true, fresh: true }} />,
      F: <WrestlerProfileCore wrestlerId={pick.fw} preview={{ offseason: true, order: true, fresh: true }} />,
    },
    college: {
      // as Insight · Collegiate shows it (Kyle 2026-11-18)
      list: <CollegeListCore live={false} embedded />,
      girlsList: <CollegeListCore live={false} g="F" embedded />,
      page: <CollegePageCore cid={Number(pick.cc) || 91} live={false} />,
      wrestler: <WrestlerProfileCore wrestlerId={pick.cw} preview={{ offseason: true, order: true, fresh: true }} />,
    },
  }
  const input = 'border border-slate-300 px-2 py-1 text-xs w-72'
  const picker = (
    <form method="get" className="mb-3 flex flex-wrap items-end gap-3 text-xs text-slate-600">
      <span className="font-semibold text-slate-800">Preview pages:</span>
      <label className="flex flex-col">Boys school id<input name="ms" defaultValue={pick.ms} className={`${input} w-24`} /></label>
      <label className="flex flex-col">Girls school id<input name="fs" defaultValue={pick.fs} className={`${input} w-24`} /></label>
      <label className="flex flex-col">Boys wrestler id<input name="mw" defaultValue={pick.mw} className={input} /></label>
      <label className="flex flex-col">Girls wrestler id<input name="fw" defaultValue={pick.fw} className={input} /></label>
      <label className="flex flex-col">College id<input name="cc" defaultValue={pick.cc} className={`${input} w-20`} /></label>
      <label className="flex flex-col">College wrestler id<input name="cw" defaultValue={pick.cw} className={input} /></label>
      <button className="px-3 py-1 bg-black text-white">Show</button>
      <span className="text-slate-400">The ids are in each page&apos;s address on the site (/boys/schools/309, /boys/wrestler/…).</span>
    </form>
  )
  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <h1 className="text-xl font-bold text-slate-900 mt-4 mb-1">Aesthetic Tool</h1>
      <p className="text-sm text-slate-500 mb-6">
        Preview the standard page look: page header and season row, region and district buttons, group
        buttons and tables. Nothing here changes the live site. When a look is approved, copy its settings
        and it gets written into the site theme (src/lib/siteTheme.ts) for every page.
      </p>
      <AestheticClient aboutRows={(data ?? []) as CalendarRow[]} previews={previews} previewPicker={picker} brackets={brackets} bracketPicker={bracketPicker} />
    </div>
  )
}
