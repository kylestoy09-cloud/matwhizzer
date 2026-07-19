/* eslint-disable @next/next/no-img-element */
export function SchoolLogoBadge({
  logoUrl,
  bgColor,
  large,
}: {
  logoUrl: string | null | undefined
  bgColor?: string | null
  large?: boolean
}) {
  if (!logoUrl) return null
  const sz = large ? 'w-8 h-8' : 'w-6 h-6'
  return (
    <div
      className={`${sz} rounded-full border border-slate-200 flex items-center justify-center shrink-0 p-0.5`}
      style={{ backgroundColor: bgColor ?? '#f1f5f9' }}
    >
      <img src={logoUrl} alt="" aria-hidden className="w-full h-full object-contain" />
    </div>
  )
}
