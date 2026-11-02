/* eslint-disable @next/next/no-img-element */
// The look of <SchoolTag>, for client components: the caller supplies the logo (pages look it
// up by school id on the server and pass it down). No school id → "TBD", never imported text.
export type SchoolBadge = { logoUrl: string | null; bgColor: string | null }

export function SchoolTagView({
  id,
  name,
  badge,
  maxWidth,
  className = 'text-[10px] text-slate-400',
}: {
  id: number | null | undefined
  name: string | null | undefined
  badge?: SchoolBadge | null
  maxWidth?: number
  className?: string
}) {
  if (id == null || !name) return <span className={`${className} italic`}>TBD</span>
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`} title={name}>
      {badge?.logoUrl ? (
        <span
          className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center shrink-0 p-px"
          style={{ backgroundColor: badge.bgColor ?? '#f1f5f9' }}
        >
          <img src={badge.logoUrl} alt="" aria-hidden className="w-full h-full object-contain" />
        </span>
      ) : (
        <span className="w-4 h-4 rounded-full border border-slate-200 bg-slate-50 shrink-0" aria-hidden />
      )}
      <span className="truncate" style={maxWidth ? { maxWidth } : undefined}>{name}</span>
    </span>
  )
}
