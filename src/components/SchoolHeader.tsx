import Link from 'next/link'
import mascotIndex from '@/data/mascot-index.json'
import { FollowSchoolButton } from '@/components/FollowSchoolButton'
import { InlineSeasonPicker } from '@/components/SeasonPicker'

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

function findMascotSvg(schoolId: number): string | null {
  const file = mascotIndex[String(schoolId) as keyof typeof mascotIndex] ?? null
  return file ? `/mascots/${encodeURIComponent(file)}` : null
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SchoolHeaderProps {
  schoolId: number
  schoolParam: string
  schoolName: string
  mascot: string | null
  nickname: string | null
  colorPrimary: string | null
  colorSecondary: string | null
  colorTertiary: string | null
  headerBackground: string | null
  logoUrl: string | null
  gender: 'boys' | 'girls'
  activeTab: string
  activeSeason: number
  tags: string[]
  districtLabel: string | null
  districtNum: string | null
  regionLabel: string | null
  regionNum: string | null
  classLabel: string | null
  secSlug: string | null
  grpSlug: string | null
  conferenceSlug: string | null
  athleticConference: string | null
  websiteUrl: string | null
  twitterHandle: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SchoolHeader({
  schoolId,
  schoolParam,
  schoolName,
  mascot,
  colorPrimary,
  colorSecondary,
  colorTertiary,
  headerBackground,
  logoUrl,
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
  websiteUrl,
  twitterHandle,
}: SchoolHeaderProps) {
  const bgColor    = headerBackground ?? colorSecondary ?? '#1a1a2e'
  const textColor  = pickTextColor(bgColor, [colorPrimary, colorSecondary, colorTertiary])
  const svgPath    = findMascotSvg(schoolId)
  const logoSrc    = logoUrl ?? svgPath
  const mascotLine = mascot?.replace(/\s*Wrestling\.?\s*$/i, '').trim() || null
  const genderBase = gender === 'girls' ? '/girls' : '/boys'
  const tabSuffix  = activeTab !== 'overview' ? `&tab=${activeTab}` : ''

  const pillClass = 'text-xs font-semibold px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 transition-colors whitespace-nowrap'
  const btnClass  = 'text-sm font-semibold px-3 py-1.5 rounded-full border hover:bg-white/10 transition-colors whitespace-nowrap'

  return (
    <div className="sticky top-0 z-20 w-full shadow-md" style={{ backgroundColor: bgColor }}>

      {/* ── Main banner row ───────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-wrap gap-4">

        {/* Left: logo badge + school name + mascot */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 flex items-center justify-center shrink-0 p-2">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="" aria-hidden="true" className="w-full h-full object-contain" />
            ) : null}
          </div>
          <div>
            <h1
              className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight leading-none"
              style={{ color: textColor }}
            >
              {schoolName}
            </h1>
            {mascotLine && (
              <p
                className="text-lg md:text-xl font-medium mt-1"
                style={{ color: textColor, opacity: 0.9 }}
              >
                {mascotLine}
              </p>
            )}
          </div>
        </div>

        {/* Right: pills (top) + actions (bottom) — side-by-side desktop, stacked mobile */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3">

          {/* Classification / location pills */}
          <div className="flex flex-wrap gap-1.5">
            {districtLabel && districtNum && (
              <Link
                href={`${genderBase}/districts/${districtNum}`}
                className={pillClass}
                style={{ color: textColor }}
              >
                {districtLabel}
              </Link>
            )}
            {regionLabel && regionNum && (
              <Link
                href={`${genderBase}/regions/${regionNum}`}
                className={pillClass}
                style={{ color: textColor }}
              >
                {regionLabel}
              </Link>
            )}
            {classLabel && secSlug && grpSlug && (
              <Link
                href={`/sections/${secSlug}/${grpSlug}?gender=${gender}`}
                className={pillClass}
                style={{ color: textColor }}
              >
                {classLabel}
              </Link>
            )}
            {athleticConference && conferenceSlug && (
              <Link
                href={`/conferences/${conferenceSlug}?gender=${gender}`}
                className={pillClass}
                style={{ color: textColor }}
              >
                {athleticConference}
              </Link>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <FollowSchoolButton schoolId={schoolId} />
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnClass}
                style={{ color: textColor, borderColor: `${textColor}55` }}
              >
                Website ↗
              </a>
            )}
            {twitterHandle && (
              <a
                href={`https://x.com/${twitterHandle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={btnClass}
                style={{ color: textColor, borderColor: `${textColor}55` }}
              >
                {twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: gender toggle + season picker + location tags ─────────── */}
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
      </div>

    </div>
  )
}
