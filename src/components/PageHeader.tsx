import Image from 'next/image'

interface PageHeaderProps {
  title: string
  showLogo?: boolean
  goldTrim?: boolean
}

export function PageHeader({ title, showLogo = true, goldTrim = false }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-center select-none">
      {showLogo && (
        <Image
          src="/images/Mat Whizzer Logo Navy - No Outline.png"
          alt=""
          width={80}
          height={80}
          className="mb-1"
          priority
        />
      )}
      <h1
        className="text-3xl sm:text-4xl font-extrabold leading-tight text-center"
        style={{
          color: '#1b2a4a',
          ...(goldTrim ? {
            textShadow: [
              '-1px -1px 0 #b8943e', '1px -1px 0 #b8943e',
              '-1px  1px 0 #b8943e', '1px  1px 0 #b8943e',
              ' 0   -1px 0 #b8943e', '0    1px 0 #b8943e',
              '-1px  0   0 #b8943e', '1px  0   0 #b8943e',
            ].join(','),
          } : {}),
        }}
      >
        {title}
      </h1>
    </div>
  )
}
