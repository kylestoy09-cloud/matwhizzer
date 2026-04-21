import Link from 'next/link'
import mascotIndex from '@/data/mascot-index.json'
import { Stardos_Stencil } from 'next/font/google'
import { FollowSchoolButton } from '@/components/FollowSchoolButton'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

const stardos = Stardos_Stencil({ weight: '700', subsets: ['latin'] })

// ── WCAG contrast helpers ─────────────────────────────────────────────────────

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

/**
 * Returns the candidate color with the highest WCAG contrast ratio against bg.
 * Skips any candidate that is identical to bg (avoid same-color-on-same-color).
 * If no candidate reaches 4.5:1, falls back to white or black, whichever wins.
 */
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

// ── SVG mascot lookup ─────────────────────────────────────────────────────────
// mascot-index.json is generated at build time by scripts/generate-mascot-index.mjs
// and maps school ID strings to their SVG filename in public/mascots/.

function findMascotSvg(schoolId: number): string | null {
  const file = mascotIndex[String(schoolId) as keyof typeof mascotIndex] ?? null
  return file ? `/mascots/${encodeURIComponent(file)}` : null
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SchoolHeaderProps {
  schoolId: number
  schoolParam: string        // URL segment (the [school] param, used in href construction)
  schoolName: string
  mascot: string | null
  nickname: string | null
  colorPrimary: string | null
  colorSecondary: string | null
  colorTertiary: string | null
  headerBackground: string | null
  gender: 'boys' | 'girls'
  activeTab: string
  activeSeason: number
  tags: string[]             // pre-built location strings, e.g. ['Hoboken', 'Hudson County']
  districtLabel: string | null
  districtNum: string | null
  regionLabel: string | null
  regionNum: string | null
  classLabel: string | null
  secSlug: string | null
  grpSlug: string | null
  conferenceSlug: string | null
  athleticConference: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────
// Server component — reads filesystem at render time for SVG lookup.
// NOTE: intended to be placed *outside* the max-w-4xl container in page.tsx
// so the background spans full viewport width.

export function SchoolHeader({
  schoolId,
  schoolParam,
  schoolName,
  mascot,
  nickname,
  colorPrimary,
  colorSecondary,
  colorTertiary,
  headerBackground,
  gender,
  activeTab,
  activeSeason,
  tags,
  districtLabel,
  districtNum,
  regionLabel,
  regionNum,
  classLabel,
  secSlug,
  grpSlug,
  conferenceSlug,
  athleticConference,
}: SchoolHeaderProps) {
  const bgColor   = headerBackground ?? colorSecondary ?? '#1a1a2e'
  const textColor = pickTextColor(bgColor, [colorPrimary, colorSecondary, colorTertiary])
  const svgPath   = findMascotSvg(schoolId)
  const mascotLine = mascot ?? null
  const genderBase = gender === 'girls' ? '/girls' : '/boys'
  const tabSuffix  = activeTab !== 'overview' ? `&tab=${activeTab}` : ''

  return (
    <div className="sticky top-0 z-20 w-full shadow-md" style={{ backgroundColor: bgColor }}>

      {/* ── Name + mascot + logo ─────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          {svgPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={svgPath}
              alt=""
              aria-hidden="true"
              className="h-32 w-auto shrink-0"
            />
          )}
          <div className="flex flex-col min-w-0 items-end sm:items-start">
            <h1
              className={`${stardos.className} text-4xl sm:text-6xl leading-none tracking-wide text-right sm:text-left`}
              style={{ color: textColor }}
            >
              {schoolName}
            </h1>
            {mascotLine && (
              <p
                className={`${stardos.className} text-2xl sm:text-3xl text-right`}
                style={{ color: textColor, opacity: 0.82 }}
              >
                {mascotLine}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Boys / Girls toggle + info pills ─────────────────────────────────── */}
      <div
        className="px-4 py-2 flex flex-wrap items-center gap-1.5 border-t"
        style={{ borderColor: `${textColor}30` }}
      >
        {/* Boys / Girls toggle */}
        <div className="flex border border-white/30 overflow-hidden text-xs mr-2 shrink-0">
          <Link
            href={`/schools/${schoolParam}?gender=boys${tabSuffix}`}
            className={`px-3 py-1.5 font-bold transition-colors ${
              gender === 'boys'
                ? 'bg-white text-slate-900'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Boys
          </Link>
          <Link
            href={`/schools/${schoolParam}?gender=girls${tabSuffix}`}
            className={`px-3 py-1.5 font-bold transition-colors border-l border-white/30 ${
              gender === 'girls'
                ? 'bg-rose-200 text-rose-900'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            Girls
          </Link>
        </div>

        <FollowSchoolButton schoolId={schoolId} />

        <div className="text-xs" style={{ color: `${textColor}99` }}>
          <InlineSeasonPicker activeSeason={activeSeason} />
        </div>

        {/* Location tags (town, county) */}
        {tags.map(tag => (
          <span
            key={tag}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/10"
            style={{ color: textColor, opacity: 0.75 }}
          >
            {tag}
          </span>
        ))}

        {/* District */}
        {districtLabel && districtNum && (
          <Link
            href={`${genderBase}/districts/${districtNum}`}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            style={{ color: textColor }}
          >
            {districtLabel}
          </Link>
        )}

        {/* Region */}
        {regionLabel && regionNum && (
          <Link
            href={`${genderBase}/regions/${regionNum}`}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            style={{ color: textColor }}
          >
            {regionLabel}
          </Link>
        )}

        {/* Section / Group classification */}
        {classLabel && secSlug && grpSlug && (
          <Link
            href={`/sections/${secSlug}/${grpSlug}?gender=${gender}`}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            style={{ color: textColor }}
          >
            {classLabel}
          </Link>
        )}

        {/* Conference */}
        {athleticConference && conferenceSlug && (
          <Link
            href={`/conferences/${conferenceSlug}?gender=${gender}`}
            className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            style={{ color: textColor }}
          >
            {athleticConference}
          </Link>
        )}
      </div>

    </div>
  )
}
