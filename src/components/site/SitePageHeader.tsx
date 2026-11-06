// The standard top of every public page (2026-11-06, Kyle): the title anchored left with a rule under
// it, then the season picker, then a one-line summary, then the page's tabs (SiteTabs). The body below
// keeps each page's own layout.
import Image from 'next/image'
import type { ReactNode } from 'react'

export type SitePageHeaderProps = {
  title: string
  picker?: ReactNode         // the season picker
  summary?: ReactNode        // one line on what the page shows
  tabs?: ReactNode           // SiteTabs rows (Group / Conference, Team / Individual, months…)
  showLogo?: boolean         // a small logo to the left of the title
  titleFontFamily?: string   // set by the Aesthetic Tool preview; pages use the default
  titleColor?: string
}

export function SitePageHeader({ title, picker, summary, tabs, showLogo = false, titleFontFamily, titleColor = '#1b2a4a' }: SitePageHeaderProps) {
  return (
    <header className="mb-6 select-none">
      <div className="flex items-center gap-3 border-b-2 pb-2" style={{ borderColor: titleColor }}>
        {showLogo && <Image src="/images/Mat Whizzer Logo Navy - No Outline.png" alt="" width={40} height={40} priority />}
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight" style={{ color: titleColor, fontFamily: titleFontFamily }}>{title}</h1>
      </div>
      {picker && <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">{picker}</div>}
      {summary && <p className="mt-2 text-sm text-slate-500">{summary}</p>}
      {tabs && <div className="mt-4">{tabs}</div>}
    </header>
  )
}
