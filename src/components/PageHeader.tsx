import Image from 'next/image'

interface PageHeaderProps {
  title: string
  showLogo?: boolean
}

export function PageHeader({ title, showLogo = true }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-center select-none">
      {showLogo && (
        <Image
          src="/mwl-hat.png"
          alt=""
          width={80}
          height={80}
          className="mb-1"
          priority
        />
      )}
      <h1 className="page-header-text text-3xl sm:text-4xl font-extrabold italic leading-tight text-center">
        {title}
      </h1>
      <style>{`
        .page-header-text {
          color: #1b2a4a;
          text-shadow:
            -1px -1px 0 #b8943e,
             1px -1px 0 #b8943e,
            -1px  1px 0 #b8943e,
             1px  1px 0 #b8943e,
             0   -1px 0 #b8943e,
             0    1px 0 #b8943e,
            -1px  0   0 #b8943e,
             1px  0   0 #b8943e;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
