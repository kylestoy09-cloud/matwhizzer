'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EmailConfirmedPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/signin')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Email Confirmed!</h1>
      <p className="text-sm text-slate-600 mb-6">
        Your Mat Whizzer account is ready. Taking you to sign in...
      </p>
      <Link href="/signin" className="text-sm text-blue-600 hover:underline">Sign In Now</Link>
    </div>
  )
}
