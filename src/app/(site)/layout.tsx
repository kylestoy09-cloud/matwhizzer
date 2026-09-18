import Image from 'next/image'
import { HeaderNav } from '@/components/HeaderNav'
import { Footer } from '@/components/Footer'
import { StagingBanner } from '@/components/StagingBanner'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StagingBanner />
      <HeaderNav />
      <main className="flex-1 relative z-10">{children}</main>
      <div className="bg-white flex justify-center py-6 mt-8">
        <Image
          src="/images/Mat Whizzer Logo Navy - No Outline.png"
          alt="Mat Whizzer"
          width={48}
          height={48}
          className="h-10 w-auto opacity-60"
        />
      </div>
      <Footer />
    </>
  )
}
