import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { HeaderNav } from '@/components/HeaderNav'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mat Whizzer',
  description: 'NJSIAA Wrestling Results 2024–25',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 min-h-screen flex flex-col`}>
        <HeaderNav />
        <main className="flex-1">{children}</main>
        <footer className="bg-slate-900 text-slate-400 text-xs text-center py-4 mt-8">
          © 2026 Mat Whizzer LLC. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
