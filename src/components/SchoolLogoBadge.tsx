/* eslint-disable @next/next/no-img-element */
export function SchoolLogoBadge({ logoUrl }: { logoUrl: string | null | undefined }) {
  if (!logoUrl) return null
  return (
    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 p-0.5">
      <img src={logoUrl} alt="" aria-hidden className="w-full h-full object-contain" />
    </div>
  )
}
