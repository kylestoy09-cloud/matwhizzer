/* eslint-disable @next/next/no-img-element */
// placeholder: draw an empty circle when there is no logo, so names in a column line up
// (leaderboards; out-of-state schools have no logo)
export function SchoolLogoBadge({
  logoUrl,
  bgColor,
  large,
  placeholder,
}: {
  logoUrl: string | null | undefined
  bgColor?: string | null
  large?: boolean
  placeholder?: boolean
}) {
  const sz = large ? 'w-8 h-8' : 'w-6 h-6'
  if (!logoUrl) {
    return placeholder ? <div className={`${sz} rounded-full border border-slate-200 bg-slate-50 shrink-0`} aria-hidden /> : null
  }
  return (
    <div
      className={`${sz} rounded-full border border-slate-200 flex items-center justify-center shrink-0 p-0.5`}
      style={{ backgroundColor: bgColor ?? '#f1f5f9' }}
    >
      <img src={logoUrl} alt="" aria-hidden className="w-full h-full object-contain" />
    </div>
  )
}
