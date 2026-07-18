'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Stardos_Stencil } from 'next/font/google'

const stardos = Stardos_Stencil({ weight: '700', subsets: ['latin'] })

// ── WCAG contrast helpers (same pipeline as SchoolHeader) ─────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) return null
  const n = parseInt(clean, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function pickTextColor(bg: string, candidates: (string | null | undefined)[]): string {
  const valid = candidates.filter((c): c is string => !!c && c.toLowerCase() !== bg.toLowerCase())
  let best = { color: '#FFFFFF', ratio: 0 }
  for (const c of valid) {
    const ratio = contrastRatio(bg, c)
    if (ratio > best.ratio) best = { color: c, ratio }
  }
  if (best.ratio >= 4.5) return best.color
  const wc = contrastRatio(bg, '#FFFFFF')
  const bc = contrastRatio(bg, '#000000')
  return wc >= bc ? '#FFFFFF' : '#000000'
}

// ── Props ──────────────────────────────────────────────────────────────────────

export type WrestlerHeaderProps = {
  schoolName: string | null
  mascotName: string | null
  primaryColor: string | null
  secondaryColor: string | null
  headerBackground: string | null
  wrestlerName: string
  grade: string | null
  primaryWeight: number | null
  schoolLink: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WrestlerHeader({
  schoolName,
  mascotName,
  primaryColor,
  secondaryColor,
  headerBackground,
  wrestlerName,
  grade,
  primaryWeight,
  schoolLink,
}: WrestlerHeaderProps) {
  const bgColor   = headerBackground ?? secondaryColor ?? '#1a1a2e'
  const textColor = pickTextColor(bgColor, [primaryColor, secondaryColor])

  // Wrestler bar pins directly below the school bar — measured live
  const [wrestlerBarTop, setWrestlerBarTop] = useState(183) // 139 nav + ~44 school bar
  useEffect(() => {
    const bar = document.querySelector('[data-wrestler-school-bar]')
    if (!bar) return
    const compute = () => setWrestlerBarTop(139 + (bar as HTMLElement).offsetHeight)
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  const schoolNameEl = (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`${stardos.className} text-base uppercase tracking-tight leading-none truncate`}
        style={{ color: textColor }}
      >
        {schoolName ?? '—'}
      </span>
      {mascotName && (
        <span className="text-xs shrink-0" style={{ color: textColor, opacity: 0.75 }}>
          {mascotName}
        </span>
      )}
    </div>
  )

  return (
    <>
      {/* ── STICKY 1: school name + mascot — compact bar ──────────────────────── */}
      <div
        data-wrestler-school-bar
        className="sticky z-20 w-full border-b"
        style={{ top: '139px', backgroundColor: bgColor, borderColor: `${textColor}20` }}
      >
        <div className="px-4 sm:px-6 py-2.5 flex items-center">
          {schoolLink ? (
            <Link href={schoolLink} className="hover:opacity-80 transition-opacity min-w-0">
              {schoolNameEl}
            </Link>
          ) : (
            schoolNameEl
          )}
        </div>
      </div>

      {/* ── STICKY 2: weight badge + wrestler name + grade ────────────────────── */}
      <div
        className="sticky z-10 w-full shadow-md"
        style={{ top: wrestlerBarTop, backgroundColor: bgColor }}
      >
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4">
          {/* Weight badge — inverted color pair so it pops against the bar */}
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold"
            style={{ backgroundColor: textColor, color: bgColor }}
          >
            <span className="text-sm leading-none tabular-nums">
              {primaryWeight ?? '?'}
            </span>
          </div>

          <div>
            <h1
              className="text-2xl md:text-3xl font-bold leading-tight"
              style={{ color: textColor }}
            >
              {wrestlerName}
            </h1>
            {grade && (
              <p className="text-sm mt-0.5" style={{ color: textColor, opacity: 0.8 }}>
                {grade}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
