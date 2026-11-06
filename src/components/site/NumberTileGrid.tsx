// The standard grid of number / label buttons (2026-11-06): region and district numbers, group
// standings, weight classes. Same size, spacing, corners, font and hover everywhere; colors come from
// src/lib/siteTheme.ts. groupSize keeps tiles together in blocks that wrap as a whole (the four boys
// districts of a region, the three girls districts), so a region is never split across lines.
import Link from 'next/link'

export type NumberTile = { key: string | number; label: string; href?: string; bg: string; fg: string; caption?: string }

export type NumberTileGridProps = {
  tiles: NumberTile[]
  fontFamily?: string        // the stencil font for the numbers
  size?: number              // tile height in px
  radius?: number            // corner radius in px
  minWidth?: number          // narrowest a tile gets before the grid wraps (ungrouped)
  groupSize?: number         // tiles per block that stays on one line
  border?: string
}

function Tile({ t, fontFamily, size, radius, border, width }: { t: NumberTile; fontFamily?: string; size: number; radius: number; border: string; width?: number }) {
  const inner = (
    <div className="flex flex-col items-center justify-center transition-[filter] hover:brightness-110"
      style={{ height: size, width, background: t.bg, color: t.fg, borderRadius: radius, border }}>
      <span className="leading-none" style={{ fontFamily, fontSize: t.label.length > 3 ? size * 0.28 : size * 0.5 }}>{t.label}</span>
      {t.caption && <span className="mt-1 text-[10px] uppercase tracking-wide opacity-80">{t.caption}</span>}
    </div>
  )
  return t.href ? <Link href={t.href} className="block">{inner}</Link> : inner
}

export function NumberTileGrid({ tiles, fontFamily, size = 72, radius = 0, minWidth = 72, groupSize, border = '1px solid #0f172a' }: NumberTileGridProps) {
  if (groupSize) {
    const groups: NumberTile[][] = []
    for (let i = 0; i < tiles.length; i += groupSize) groups.push(tiles.slice(i, i + groupSize))
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {groups.map((g, i) => (
          <div key={i} className="flex gap-2">{g.map(t => <Tile key={t.key} t={t} fontFamily={fontFamily} size={size} radius={radius} border={border} width={size} />)}</div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {tiles.map(t => <Tile key={t.key} t={t} fontFamily={fontFamily} size={size} radius={radius} border={border} />)}
    </div>
  )
}
