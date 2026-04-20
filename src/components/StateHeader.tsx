import Image from 'next/image'

interface StateHeaderProps {
  gender: 'M' | 'F'
}

export function StateHeader({ gender }: StateHeaderProps) {
  const label = gender === 'M' ? "Boy's" : "Girl's"

  return (
    <div className="flex flex-col items-center select-none">
      <Image
        src="/images/Mat Whizzer Logo Navy - No Outline.png"
        alt=""
        width={100}
        height={100}
        className="mb-1"
        priority
      />
      <p className="page-header-text text-sm tracking-[0.15em] uppercase">NJSIAA</p>
      <h1 className="page-header-text text-4xl sm:text-5xl font-extrabold leading-tight">
        {label} Wrestling
      </h1>
      <p className="page-header-text text-2xl sm:text-3xl font-extrabold leading-tight">
        State Tournament
      </p>
      <p className="page-header-text text-3xl sm:text-4xl font-extrabold mt-0.5">
        2026
      </p>
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
          font-style: normal;
        }
      `}</style>
    </div>
  )
}
