import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import Image from 'next/image'
import './globals.css'
import { HeaderNav } from '@/components/HeaderNav'
import { Footer } from '@/components/Footer'
import { DataDisclosure } from '@/components/DataDisclosure'
import { StagingBanner } from '@/components/StagingBanner'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mat Whizzer',
  description: 'NJSIAA Wrestling Results 2024–25',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Mat Whizzer',
    description: 'NJSIAA Wrestling Results 2024–25',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mat Whizzer — NJSIAA Wrestling',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-XN8HTK8ZY1" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XN8HTK8ZY1');
      `}</Script>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white min-h-screen flex flex-col`}>
        {/* Faint fixed background watermark */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'url(/images/Mat Whizzer Logo Navy - No Outline.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: '1050px',
            opacity: 0.05,
          }}
        />
        <StagingBanner />
        <HeaderNav />
        <main className="flex-1 relative z-10">{children}</main>
        <DataDisclosure />
        {/* Logo in white section above footer */}
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
      </body>
    </html>
  )
}
