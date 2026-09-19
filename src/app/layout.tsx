import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { getSeasons } from '@/lib/seasons-server'
import { SeasonsProvider } from '@/components/SeasonsProvider'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

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
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Mat Whizzer — NJSIAA Wrestling' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.jpg'],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Don't take down every page (admin included) if the seasons lookup fails.
  const seasons = await getSeasons().catch(err => {
    console.error(err)
    return []
  })
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
        <SeasonsProvider seasons={seasons}>{children}</SeasonsProvider>
      </body>
    </html>
  )
}
