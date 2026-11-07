import { getAllConferences } from '@/lib/conferences'
import { getActiveSeason } from '@/lib/get-season'
import { InlineSeasonPicker } from '@/components/SeasonPicker'
import { SiteTabs } from '@/components/site/SiteTabs'
import { StdHeader } from '@/components/site/StdPage'
import { BoysGroupButtons, ConferenceButtons } from './StandingsButtons'
import { sectionToSlug, groupToSlug } from '@/lib/sections'

const SECTIONS = ['North I', 'North II', 'Central', 'South'] as const
const PUBLIC_GROUPS = ['1', '2', '3', '4', '5'] as const
const NP_GROUPS = ['A', 'B'] as const

export type StandingsView = 'group' | 'conference'
export const standingsView = (v: string | undefined): StandingsView => (v === 'conference' ? 'conference' : 'group')

// Group / Conference tabs in the page header (also the header's Standings menu)
export function StandingsTabs({ base, view }: { base: string; view: StandingsView }) {
  return <SiteTabs items={[['group', 'Group'], ['conference', 'Conference']].map(([v, label]) => ({ key: v, label, href: `${base}?view=${v}` }))} active={view} />
}

// the standard frame: title, season picker, summary, Group / Conference tabs
export async function StandingsHeader({ gender, view, base }: { gender: 'boys' | 'girls'; view: StandingsView; base: string }) {
  const season = await getActiveSeason(gender === 'girls' ? 'F' : 'M')
  return (
    <StdHeader title={`${gender === 'girls' ? 'Girls' : 'Boys'} Standings`} summaryKey="standings"
      picker={<InlineSeasonPicker gender={gender === 'girls' ? 'F' : 'M'} activeSeason={season} />}
      tabs={<StandingsTabs base={base} view={view} />} />
  )
}

// conferences as standard tiles in the accent color (the logos are gone, 2026-11-06)
export function ConferenceGrid({ gender }: { gender: 'boys' | 'girls' }) {
  return <ConferenceButtons side={gender} buttons={getAllConferences().map(c => ({ key: c.slug, label: c.name, href: `/conferences/${c.slug}?gender=${gender}` }))} />
}

export async function StandingsContent({ gender, view, base }: { gender: 'boys' | 'girls'; view: StandingsView; base: string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <StandingsHeader gender={gender} view={view} base={base} />
      {view === 'conference' ? <ConferenceGrid gender={gender} /> : (
        <BoysGroupButtons
          rows={SECTIONS.map(section => ({ section, buttons: PUBLIC_GROUPS.map(g => ({ key: g, label: `Group ${g}`, href: `/sections/${sectionToSlug(section)}/${groupToSlug(g)}?gender=${gender}` })) }))}
          nonPublic={NP_GROUPS.map(g => ({ key: g, label: `Group ${g}`, href: `/sections/${sectionToSlug('Non-Public')}/${groupToSlug(g)}?gender=${gender}` }))} />
      )}
    </div>
  )
}
