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

export function StdHeader({ title, summaryKey, picker, tabs }: { title: string; summaryKey: SummaryKey; picker?: ReactNode; tabs?: ReactNode }) {
  const look = useSiteLook()
  return (
    <SitePageHeader title={title} picker={picker} summary={look.summaries[summaryKey]} tabs={tabs} showLogo={look.showLogo}
      titleFontFamily={fontStack(look.titleFont)} titleSize={look.titleSize} />
  )
}

export function StdTiles({ tiles, scale = 1, minWidth, groupSize, center }: { tiles: NumberTile[]; scale?: number; minWidth?: number; groupSize?: number; center?: boolean }) {
  const look = useSiteLook()
  const size = Math.round(look.size * scale)
  return <NumberTileGrid tiles={tiles} fontFamily={fontStack(look.font)} size={size} radius={look.radius} border={lookBorder(look)} minWidth={minWidth ?? size} groupSize={groupSize} center={center} />
}

export function useSideColors(side: 'boys' | 'girls') {
  const look = useSiteLook()
  return {
    region: (r: number) => lookTile(look, side, r),
    district: (d: number) => lookTile(look, side, side === 'girls' ? girlsRegionOfDistrict(d) : boysRegionOfDistrict(d)),
    accent: lookAccent(look, side),
  }
}
