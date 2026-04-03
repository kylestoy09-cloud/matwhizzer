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
  sm: { width: 80, initials: 'text-sm', weightNum: 'text-sm', weightLbs: 'text-[8px]', stripPy: 'py-0.5' },
  md: { width: 140, initials: 'text-xl', weightNum: 'text-lg', weightLbs: 'text-[10px]', stripPy: 'py-1' },
  lg: { width: 240, initials: 'text-4xl', weightNum: 'text-2xl', weightLbs: 'text-xs', stripPy: 'py-1.5' },
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
      className={isLg ? 'w-full' : 'inline-block shrink-0'}
      style={isLg ? undefined : { width: s.width }}
    >
      {school.logo_url ? (
        <Image
          src={school.logo_url}
          alt={school.display_name}
          width={1079}
          height={647}
          className={`w-full h-auto ${isLg ? '' : 'rounded-none'}`}
        />
      ) : (
        <div
          className={`w-full aspect-[1079/647] ${isLg ? '' : 'rounded-none'} flex items-center justify-center font-bold ${s.initials}`}
          style={{ backgroundColor: pc, color: sc }}
        >
          {schoolInitials(school.display_name)}
        </div>
      )}

      {hasWeight && (
        <div
          className={`bg-white text-center ${s.stripPy} ${isLg ? '' : 'rounded-none'}`}
          style={{ borderTop: `3px solid ${pc}` }}
        >
          <span className={`font-bold tracking-wide ${s.weightNum}`} style={{ color: pc }}>
            {weight}
          </span>
          <span className={`font-medium ml-0.5 ${s.weightLbs}`} style={{ color: pc }}>
            lbs
          </span>
        </div>
      )}
    </div>
  )
}
