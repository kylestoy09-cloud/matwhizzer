'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div
        style={{ animationDuration: '2s' }}
        className="animate-bounce mb-10"
      >
        <Image
          src="/apple-touch-icon.png"
          alt=""
          width={160}
          height={160}
          priority
        />
      </div>

      <p className="text-xl text-gray-700 max-w-lg leading-relaxed">
        Dog must have unplugged the old Compaq Presario. Someone email me
        and I&apos;ll plug her back in when I get home.
      </p>

      <button
        onClick={reset}
        className="mt-8 px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors text-sm"
      >
        Try Again
      </button>

      <Link
        href="/feedback"
        className="mt-4 px-6 py-3 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition-colors text-sm"
      >
        Submit Feedback
      </Link>

      <Link
        href="/"
        className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Back to home
      </Link>

      {error.digest && (
        <p className="mt-10 text-xs text-gray-300">
          ref: {error.digest}
        </p>
      )}
    </div>
  )
}
