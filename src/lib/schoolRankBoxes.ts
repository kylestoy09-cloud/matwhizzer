// The Power Rankings and Conference Rankings boxes on a school profile (Kyle 2026-11-16): the school's place in its
// section/group Power Points list (girls: the North / South / Non-classified lists) and in its conference division,
// read the same way as the Sections and Conferences pages. null = not on that list this season.
import { supabase } from '@/lib/supabase/public-cached'
import { buildPowerPointStandings, buildGirlsPowerPointGroups } from '@/lib/standings'
import { conferenceFromSlug } from '@/lib/conferences'

export type RankBox = { place: number; of: number; label: string; href: string | null }

export async function powerRankBox(g: 'M' | 'F', season: number, schoolId: number, section: string | null, classification: string | null, sectionHref: string | null): Promise<RankBox | null> {
  if (g === 'F') {
    const groups = await buildGirlsPowerPointGroups(season)
    const names = { north: 'North', south: 'South', non_classified: 'Non-classified' } as const
    for (const k of Object.keys(names) as (keyof typeof names)[]) {
      const i = groups[k].findIndex(r => r.id === schoolId)
      if (i >= 0) return { place: groups[k][i].rank, of: groups[k].length, label: names[k], href: '/girls/standings' }
    }
    return null
  }
  if (!section || !classification) return null
  const { data } = await supabase.from('schools').select('id, display_name, mascot, primary_color, logo_url, header_background')
    .eq('section', section).eq('classification', classification).eq('is_combined', false)
  const rows = await buildPowerPointStandings((data ?? []) as never, 'boys', season)
  const me = rows.find(r => r.id === schoolId)
  if (!me) return null
  const label = section === 'Non-Public' ? `Non-Public ${classification}` : `${section} Group ${classification}`
  return { place: me.rank, of: rows.length, label, href: sectionHref }
}

type Row = { school_id: number | null; division: string; overall_wins: number; overall_losses: number; div_wins: number; div_losses: number; pf: number }
const pct = (w: number, l: number) => (w + l === 0 ? 0 : w / (w + l))

export async function conferenceRankBox(g: 'M' | 'F', season: number, schoolId: number): Promise<RankBox | null> {
  const { data: mine } = await supabase.from('conference_standings').select('conference_slug, division')
    .eq('school_id', schoolId).eq('season_id', season).eq('gender', g).limit(1).maybeSingle()
  if (!mine) return null
  const { data } = await supabase.from('conference_standings').select('school_id, division, overall_wins, overall_losses, div_wins, div_losses, pf')
    .eq('conference_slug', mine.conference_slug).eq('division', mine.division).eq('season_id', season).eq('gender', g)
  // as on the conference page: division record, then overall record, then points for
  const rows = ((data ?? []) as Row[]).sort((a, b) => pct(b.div_wins, b.div_losses) - pct(a.div_wins, a.div_losses) || pct(b.overall_wins, b.overall_losses) - pct(a.overall_wins, a.overall_losses) || b.pf - a.pf)
  const i = rows.findIndex(r => r.school_id === schoolId)
  if (i < 0) return null
  const conf = conferenceFromSlug(mine.conference_slug) ?? mine.conference_slug
  const div = !mine.division ? null : /division/i.test(mine.division) ? mine.division : mine.division.length <= 2 ? `Division ${mine.division}` : `${mine.division} Division`   // "Division B", "American Division"
  return { place: i + 1, of: rows.length, label: [conf, div].filter(Boolean).join(' · '), href: `/conferences/${mine.conference_slug}?gender=${g === 'F' ? 'girls' : 'boys'}` }
}
