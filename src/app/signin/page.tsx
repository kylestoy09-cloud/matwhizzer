'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createSupabaseBrowser()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Set preference cookie for homepage personalization
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('wrestling_preference')
        .eq('id', user.id)
        .maybeSingle()
      const pref = (profile as { wrestling_preference: string } | null)?.wrestling_preference ?? 'both'
      document.cookie = `wrestling_pref=${pref};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">Sign In</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-1 text-right">
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-none px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white rounded-none py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
