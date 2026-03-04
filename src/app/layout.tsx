import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { HeaderNav } from '@/components/HeaderNav'
import { getActiveSeason } from '@/lib/get-season'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mat Whizzer',
  description: 'NJSIAA Wrestling Results 2024–25',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const activeSeason = await getActiveSeason()

  return (
    <html lang="en">
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-XN8HTK8ZY1" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XN8HTK8ZY1');
      `}</Script>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 min-h-screen flex flex-col`}>
        <HeaderNav activeSeason={activeSeason} />
        <main className="flex-1">{children}</main>
        <footer className="bg-slate-900 text-slate-400 text-xs text-center py-4 mt-8 flex items-center justify-center gap-4">
          <span>© 2026 Mat Whizzer LLC. All rights reserved.</span>
          <a href="/feedback" className="hover:text-slate-200 transition-colors underline underline-offset-2">Feedback</a>
        </footer>
      </body>
    </html>
  )
}
