'use client'
// The standard page frame on the live site, set by the saved look (src/lib/siteLook.ts):
//   StdHeader   title (left, rule under it), season picker, the page's summary from the tool, tabs
//   StdTiles    the standard buttons (regions, districts, weights, groups) in the look's font and size
//   useSideColors(side)   region / district colors and the accent (boys region 7, girls region 3)
import type { ReactNode } from 'react'
import { SitePageHeader } from './SitePageHeader'
import { NumberTileGrid, type NumberTile } from './NumberTileGrid'
import { useSiteLook } from './SiteLookProvider'
import { fontStack, lookAccent, lookBorder, lookTile, type SummaryKey } from '@/lib/siteLook'
import { boysRegionOfDistrict, girlsRegionOfDistrict } from '@/lib/siteTheme'

// hideSummary: no description under the picker (Kyle 2026-11-14: the Individual Post Season page)
// noLogo: never the logo, whatever the look says (Kyle 2026-11-14: the bracket pages)
// summary: the page's own line in place of the tool's (Kyle 2026-11-18: the college list, a line per level)
export function StdHeader({ title, summaryKey, picker, tabs, hideSummary, noLogo, summary }: { title: string; summaryKey: SummaryKey; picker?: ReactNode; tabs?: ReactNode; hideSummary?: boolean; noLogo?: boolean; summary?: ReactNode }) {
  const look = useSiteLook()
  return (
    <SitePageHeader title={title} picker={picker} summary={summary ?? (hideSummary ? undefined : look.summaries[summaryKey])} tabs={tabs} showLogo={look.showLogo && !noLogo}
      titleFontFamily={fontStack(look.titleFont)} titleSize={look.titleSize} />
  )
}

// widthScale: tiles that many times wider than tall, for word labels (the girls' named regions: North I, Central …)
export function StdTiles({ tiles, scale = 1, minWidth, groupSize, center, widthScale }: { tiles: NumberTile[]; scale?: number; minWidth?: number; groupSize?: number; center?: boolean; widthScale?: number }) {
  const look = useSiteLook()
  const size = Math.round(look.size * scale)
  return <NumberTileGrid tiles={tiles} fontFamily={fontStack(look.font)} size={size} radius={look.radius} border={lookBorder(look)} minWidth={widthScale ? Math.round(size * widthScale) : minWidth ?? size} groupSize={widthScale ? undefined : groupSize} center={center} />
}

export function useSideColors(side: 'boys' | 'girls') {
  const look = useSiteLook()
  return {
    region: (r: number) => lookTile(look, side, r),
    district: (d: number) => lookTile(look, side, side === 'girls' ? girlsRegionOfDistrict(d) : boysRegionOfDistrict(d)),
    accent: lookAccent(look, side),
  }
}
