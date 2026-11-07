import Image from 'next/image'
import { HeaderNav } from '@/components/HeaderNav'
import { Footer } from '@/components/Footer'
import { StagingBanner } from '@/components/StagingBanner'
import { SiteLookProvider } from '@/components/site/SiteLookProvider'
import { getSiteLook } from '@/lib/siteLookServer'
import { fontsCss } from '@/lib/siteLook'

// the saved look (Aesthetic Tool) frames every public page: its fonts load from Google Fonts in the
// browser, the header follows its layout, and pages read it through SiteLookProvider
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const look = await getSiteLook()
  const css = fontsCss([look.font, look.titleFont])
  return (
    <SiteLookProvider look={look}>
      {css && <link rel="stylesheet" href={css} precedence="default" />}
      <StagingBanner />
      <HeaderNav layout={look.headerLayout} />
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
    </SiteLookProvider>
  )
}
