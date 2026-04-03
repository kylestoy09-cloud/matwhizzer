import Image from 'next/image'

type WrestlerAvatarProps = {
  school: {
    display_name: string
    primary_color: string | null
    secondary_color: string | null
    logo_url: string | null
  }
  weight?: number | null
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { container: 56, badge: 'text-[9px] px-1.5 py-0.5 -bottom-2', initials: 'text-sm', logo: 64 },
  md: { container: 90, badge: 'text-[11px] px-2 py-0.5 -bottom-2.5', initials: 'text-xl', logo: 64 },
  lg: { container: 160, badge: 'text-sm px-3 py-1 -bottom-3', initials: 'text-4xl', logo: 512 },
}

function schoolInitials(name: string) {
  const words = name.split(/[\s-]+/).filter(w => !['of', 'at', 'the'].includes(w.toLowerCase()))
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function WrestlerAvatar({ school, weight, size = 'sm' }: WrestlerAvatarProps) {
  const s = SIZES[size]
  const pc = school.primary_color ?? '#1a1a2e'
  const sc = school.secondary_color ?? '#FFD700'

  // Swap logo URL to the appropriate size
  const logoUrl = school.logo_url
    ? school.logo_url.replace('/512/', `/${s.logo}/`).replace('/64/', `/${s.logo}/`)
    : null

  return (
    <div className="relative inline-flex shrink-0" style={{ width: s.container, height: s.container }}>
      {/* Square background with logo or initials */}
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={school.display_name}
          width={s.container}
          height={s.container}
          className="w-full h-full rounded-lg object-cover"
        />
      ) : (
        <div
          className={`w-full h-full rounded-lg flex items-center justify-center font-bold ${s.initials}`}
          style={{ backgroundColor: pc, color: sc }}
        >
          {schoolInitials(school.display_name)}
        </div>
      )}

      {/* Weight badge */}
      {weight != null && weight > 0 && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 rounded-full font-bold whitespace-nowrap ${s.badge}`}
          style={{ backgroundColor: pc, color: sc, borderWidth: 2, borderColor: sc }}
        >
          {weight}
        </span>
      )}
    </div>
  )
}
