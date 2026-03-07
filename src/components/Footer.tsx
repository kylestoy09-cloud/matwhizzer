'use client'

import { usePathname } from 'next/navigation'

export function Footer() {
  const pathname = usePathname()
  const isGirls = pathname.startsWith('/girls')
  const bg = isGirls ? 'bg-rose-900' : 'bg-slate-900'

  return (
    <footer className={`${bg} text-slate-400 text-xs text-center py-4 flex items-center justify-center gap-4`}>
      <span>&copy; 2026 Mat Whizzer LLC. All rights reserved.</span>
      <a href="/feedback" className="hover:text-slate-200 transition-colors underline underline-offset-2">Feedback</a>
    </footer>
  )
}
