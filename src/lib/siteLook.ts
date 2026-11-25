// The site look (2026-11-07): the settings the Aesthetic Tool saves (site_aesthetic_versions; the newest
// save is in effect) and what the public pages derive from them. One definition for the tool and the
// site, so they can't drift. Server loading: src/lib/siteLookServer.ts; pages read it through
// src/components/site/SiteLookProvider.tsx.

import { BRACKET_LOOK_DEFAULT, type BracketLook } from './bracketLook'
import { BOYS_REGION_BG, GIRLS_REGION_BG, regionTile, type StencilFont, type TileColors } from './siteTheme'

// each page's summary line, editable in the tool ('about' is Insight's)
export const SUMMARY_DEFAULTS = {
  schedule: 'Dual meets and tournaments by date',
  standings: 'NJSIAA power points and records',
  leaderboards: 'Season leaders by category',
  tournaments: 'In-season tournaments and their winners',
  'ps-team': 'Team tournament brackets by section and group',
  'ps-individual': 'State champions, podium schools, point leaders, and every bracket',
  region: 'Brackets, placewinners and team scores',
  district: 'Brackets, placewinners and team scores',
  state: 'Boardwalk Hall · double elimination',
  h2h: 'Compare two wrestlers',
  about: 'Reports, rankings, the daily challenge, polls, and how the site works',
}
export type SummaryKey = keyof typeof SUMMARY_DEFAULTS

export type SiteLook = {
  boys: Record<number, string>
  girls: Record<number, string>
  boysOddFg: string | null    // null = the rule (region 8's gray / region 7's navy)
  boysEvenFg: string | null
  font: StencilFont           // button numbers
  titleFont: string           // page titles; 'Site default' = the site's font
  titleSize: number           // px
  summaries: Record<SummaryKey, string>
  size: number                // tile height, px
  radius: number
  border: boolean
  showLogo: boolean
  headerLayout: 'live' | 'proposed'   // proposed: hamburger left of the logo, Boys / Girls left of the search
  bracket: BracketLook        // the bracket format (Aesthetic tool → Brackets)
}

export const DEFAULT_LOOK: SiteLook = {
  boys: { ...BOYS_REGION_BG }, girls: { ...GIRLS_REGION_BG },
  boysOddFg: null, boysEvenFg: null,
  font: 'Saira Stencil One', titleFont: 'Site default', titleSize: 24, summaries: { ...SUMMARY_DEFAULTS },
  size: 72, radius: 0, border: true, showLogo: false, headerLayout: 'proposed',
  bracket: { ...BRACKET_LOOK_DEFAULT },
}

// a saved look over the defaults: settings added to the tool later get their default until saved
export function mergeLook(x: Partial<SiteLook> | null | undefined): SiteLook {
  return { ...DEFAULT_LOOK, ...(x ?? {}), summaries: { ...DEFAULT_LOOK.summaries, ...(x?.summaries ?? {}) }, bracket: { ...DEFAULT_LOOK.bracket, ...(x?.bracket ?? {}) } }
}

// the fonts the tool offers: Google Fonts family + the weights it loads
export const LOOK_FONTS: Record<string, string> = {
  'Stardos Stencil': 'Stardos+Stencil:wght@400;700',
  'Saira Stencil One': 'Saira+Stencil+One',
  'Big Shoulders Stencil': 'Big+Shoulders+Stencil:wght@700',
  'Allerta Stencil': 'Allerta+Stencil',
  'Oswald': 'Oswald:wght@600;700',
  'Bebas Neue': 'Bebas+Neue',
  'Barlow Condensed': 'Barlow+Condensed:wght@600;700',
  'Archivo Black': 'Archivo+Black',
  'Roboto Condensed': 'Roboto+Condensed:wght@700',
}
export const TITLE_FONT_NAMES = ['Site default', ...Object.keys(LOOK_FONTS)]
export const fontStack = (name: string | undefined) => (name && LOOK_FONTS[name] ? `'${name}', sans-serif` : undefined)
// the Google Fonts stylesheet for these fonts (loaded in the browser, not at build time)
export const fontsCss = (names: (string | undefined)[]) => {
  const fams = [...new Set(names.filter((n): n is string => !!n && !!LOOK_FONTS[n]))].map(n => `family=${LOOK_FONTS[n]}`)
  return fams.length ? `https://fonts.googleapis.com/css2?${fams.join('&')}&display=swap` : null
}

// a region's button colors for one side (districts take their region's)
export function lookTile(look: SiteLook, side: 'boys' | 'girls', region: number): TileColors {
  if (side === 'girls') return regionTile(look.girls, region)
  const t = regionTile(look.boys, region)
  return { bg: t.bg, fg: region % 2 === 1 ? (look.boysOddFg ?? t.fg) : (look.boysEvenFg ?? t.fg) }
}
// weight, conference and State buttons: boys region 7, girls region 3
export const lookAccent = (look: SiteLook, side: 'boys' | 'girls') => lookTile(look, side, side === 'girls' ? 3 : 7)
export const lookBorder = (look: SiteLook) => (look.border ? '1px solid #0f172a' : 'none')
