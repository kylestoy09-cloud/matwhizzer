'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function GenderSync() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const saved   = (localStorage.getItem('mw_gender') as 'boys' | 'girls' | null) ?? 'boys'
    const current = searchParams.get('gender')
    if (current !== saved) {
      const next = new URLSearchParams(searchParams.toString())
      next.set('gender', saved)
      router.replace(`${pathname}?${next.toString()}`)
    }
  }, [])

  return null
}
