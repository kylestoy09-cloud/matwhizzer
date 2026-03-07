import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import Image from 'next/image'
import './globals.css'
import { HeaderNav } from '@/components/HeaderNav'
import { Footer } from '@/components/Footer'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mat Whizzer',
  description: 'NJSIAA Wrestling Results 2024–25',
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
        <HeaderNav />
        <main className="flex-1">{children}</main>
        {/* Logo in white section above footer */}
        <div className="bg-white flex justify-center py-6 mt-8">
          <Image
            src="/mwl-hat.png"
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
