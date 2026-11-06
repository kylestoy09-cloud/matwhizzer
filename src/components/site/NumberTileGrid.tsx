// The standard grid of number / label buttons (2026-11-06): region and district numbers, group
// standings, weight classes. Same size, spacing, corners, font and hover everywhere; colors come from
// src/lib/siteTheme.ts.
import Link from 'next/link'

export type NumberTile = { key: string | number; label: string; href?: string; bg: string; fg: string; caption?: string }

export type NumberTileGridProps = {
  tiles: NumberTile[]
  fontFamily?: string        // the stencil font for the numbers
  size?: number              // tile height in px
  radius?: number            // corner radius in px
  minWidth?: number          // narrowest a tile gets before the grid wraps
  border?: string
}

export function NumberTileGrid({ tiles, fontFamily, size = 72, radius = 0, minWidth = 72, border = '1px solid #0f172a' }: NumberTileGridProps) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {tiles.map(t => {
        const inner = (
          <div
            className="flex flex-col items-center justify-center transition-[filter] hover:brightness-110"
            style={{ height: size, background: t.bg, color: t.fg, borderRadius: radius, border }}
          >
            <span className="leading-none" style={{ fontFamily, fontSize: t.label.length > 3 ? size * 0.28 : size * 0.5 }}>{t.label}</span>
            {t.caption && <span className="mt-1 text-[10px] uppercase tracking-wide opacity-80">{t.caption}</span>}
          </div>
        )
        return t.href ? <Link key={t.key} href={t.href} className="block">{inner}</Link> : <div key={t.key}>{inner}</div>
      })}
    </div>
  )
}
