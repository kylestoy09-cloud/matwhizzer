// The standard top of every public page (2026-11-06): optional small logo, the title, an optional
// one-line subtitle, then the season row (season picker first, then any page toggles), always in the
// same place. The body below is each page's own.
import Image from 'next/image'
import type { ReactNode } from 'react'

export type SitePageHeaderProps = {
  title: string
  subtitle?: ReactNode
  seasonRow?: ReactNode          // the season picker, then toggles (Group / Conference, …)
  showLogo?: boolean
  titleFontFamily?: string       // set by the Aesthetic Tool preview; pages use the default
  titleColor?: string
}

export function SitePageHeader({ title, subtitle, seasonRow, showLogo = false, titleFontFamily, titleColor = '#1b2a4a' }: SitePageHeaderProps) {
  return (
    <header className="mb-8 text-center select-none">
      {showLogo && (
        <Image src="/images/Mat Whizzer Logo Navy - No Outline.png" alt="" width={56} height={56} className="mx-auto mb-1" priority />
      )}
      <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: titleColor, fontFamily: titleFontFamily }}>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      {seasonRow && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">{seasonRow}</div>
      )}
    </header>
  )
}
