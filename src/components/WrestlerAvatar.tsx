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
  sm: { width: 80, badge: 'text-[9px] px-1.5 py-0.5', initials: 'text-sm' },
  md: { width: 140, badge: 'text-[11px] px-2 py-0.5', initials: 'text-xl' },
  lg: { width: 240, badge: 'text-sm px-3 py-1', initials: 'text-4xl' },
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
  const hasWeight = weight != null && weight > 0

  const isLg = size === 'lg'

  return (
    <div
      className={`relative ${isLg ? 'w-full' : 'inline-block shrink-0'}`}
      style={isLg ? { paddingBottom: 32 } : { width: s.width }}
    >
      {school.logo_url ? (
        <Image
          src={school.logo_url}
          alt={school.display_name}
          width={1079}
          height={647}
          className={`w-full h-auto ${isLg ? '' : 'rounded-lg'}`}
        />
      ) : (
        <div
          className={`w-full aspect-[1079/647] ${isLg ? '' : 'rounded-lg'} flex items-center justify-center font-bold ${s.initials}`}
          style={{ backgroundColor: pc, color: sc }}
        >
          {schoolInitials(school.display_name)}
        </div>
      )}

      {hasWeight && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 -bottom-2 rounded-full font-bold whitespace-nowrap ${s.badge}`}
          style={{ backgroundColor: pc, color: sc, borderWidth: 2, borderColor: sc }}
        >
          {weight}
        </span>
      )}
    </div>
  )
}
